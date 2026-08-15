import asyncio
import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from config import settings
from dependencies.auth import get_current_user
from models.auth import User
from services.pipeline import run_pipeline
from services.rate_limit import retry_message, upload_limiter
from services.resume_parser import extract_text

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_CITY_LEN = 80
MAX_CITIES = 5
ACCEPTED_EXTENSIONS = {".pdf", ".txt"}
ACCEPTED_MIME = {"application/pdf", "text/plain"}


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def normalise_preferred_cities(raw: str | None) -> list[str]:
    """Parse a comma-separated city string into at most 5 unique names."""
    if not raw:
        return []
    seen: set[str] = set()
    cities: list[str] = []
    for part in raw.replace(";", ",").split(","):
        city = part.strip()[:MAX_CITY_LEN]
        key = city.lower()
        if not city or key in seen:
            continue
        seen.add(key)
        cities.append(city)
        if len(cities) >= MAX_CITIES:
            break
    return cities


@router.post("/analyze")
async def analyze(
    file: UploadFile,
    user: User = Depends(get_current_user),
    city: str = Form(""),
):
    allowed, retry_after = upload_limiter.hit(
        user.sub,
        settings.resume_upload_limit,
        settings.resume_upload_window_seconds,
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=retry_message(
                retry_after,
                settings.resume_upload_limit,
                settings.resume_upload_window_seconds,
            ),
            headers={"Retry-After": str(retry_after)},
        )

    # Validate extension and/or MIME type
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ACCEPTED_EXTENSIONS and file.content_type not in ACCEPTED_MIME:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF or plain text (.txt) file.",
        )

    # Read and validate size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File exceeds the 5 MB size limit.",
        )

    preferred_cities = normalise_preferred_cities(city)

    async def event_stream():
        # Progress messages are pushed here via a queue
        queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def progress_cb(message: str) -> None:
            await queue.put(_sse("progress", {"message": message}))

        async def run():
            try:
                # Extract text
                await queue.put(_sse("progress", {"message": "Extracting resume text..."}))
                try:
                    resume_text = extract_text(file_bytes, file.filename or "upload")
                except ValueError as exc:
                    msg = str(exc)
                    if msg == "empty":
                        msg = "Could not extract text from the uploaded file."
                    await queue.put(_sse("error", {"message": msg}))
                    await queue.put(None)  # sentinel
                    return
                except Exception:
                    # Malformed/corrupt file: parsers raise library-specific errors.
                    logger.exception("Resume text extraction failed")
                    await queue.put(
                        _sse(
                            "error",
                            {"message": "Could not read the uploaded file. It may be corrupt."},
                        )
                    )
                    await queue.put(None)
                    return

                response = await run_pipeline(
                    resume_text, progress_cb, preferred_cities=preferred_cities
                )

                # Emit per-warning frames
                for warning in response.warnings:
                    await queue.put(_sse("warning", {"message": warning}))

                # Final done frame
                await queue.put(_sse("done", response.model_dump(mode="json")))

            except asyncio.CancelledError:
                logger.info("Analyze cancelled for user %s", user.sub)
                raise
            except ValueError as exc:
                await queue.put(_sse("error", {"message": str(exc)}))
            except Exception:
                logger.exception("Unexpected pipeline error")
                await queue.put(_sse("error", {"message": "An unexpected server error occurred."}))
            finally:
                await queue.put(None)  # sentinel to end stream

        task = asyncio.create_task(run())

        try:
            while True:
                frame = await queue.get()
                if frame is None:
                    break
                yield frame
        finally:
            task.cancel()

    return StreamingResponse(event_stream(), media_type="text/event-stream")
