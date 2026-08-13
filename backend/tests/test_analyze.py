"""Integration tests for POST /api/analyze."""

from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from models.schemas import PipelineResponse, ValidatedJobResult
from models.auth import User
from main import app
from services.auth import COOKIE_NAME, create_access_token
from services.rate_limit import upload_limiter


def _parse_sse(raw: str) -> list[tuple[str, str]]:
    """Return list of (event_type, data_json) from an SSE body."""
    frames: list[tuple[str, str]] = []
    for chunk in raw.split("\n\n"):
        if not chunk.strip():
            continue
        event_type = "message"
        data = ""
        for line in chunk.split("\n"):
            if line.startswith("event:"):
                event_type = line[len("event:") :].strip()
            elif line.startswith("data:"):
                data = line[len("data:") :].strip()
        if data:
            frames.append((event_type, data))
    return frames


@pytest.fixture(autouse=True)
def _reset_upload_limiter():
    upload_limiter.reset()
    yield
    upload_limiter.reset()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def authed_client(client: AsyncClient):
    token = create_access_token(
        User(sub="test-user", email="test@example.com", name="Test User")
    )
    client.cookies.set(COOKIE_NAME, token)
    return client


@pytest.mark.asyncio
async def test_analyze_requires_auth(client: AsyncClient):
    files = {"file": ("resume.txt", b"hello", "text/plain")}
    resp = await client.post("/api/analyze", files=files)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_reject_unsupported_file_type(authed_client: AsyncClient):
    files = {"file": ("resume.docx", b"not a real docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    resp = await authed_client.post("/api/analyze", files=files)
    assert resp.status_code == 400
    assert "Unsupported" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_reject_oversized_file(authed_client: AsyncClient):
    big = b"x" * (5 * 1024 * 1024 + 1)
    files = {"file": ("resume.txt", big, "text/plain")}
    resp = await authed_client.post("/api/analyze", files=files)
    assert resp.status_code == 400
    assert "5 MB" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_empty_text_pdf_emits_error_event(authed_client: AsyncClient):
    # Minimal valid-ish PDF bytes aren't required — we stub extract_text.
    with patch("routers.analyze.extract_text", side_effect=ValueError("empty")):
        files = {"file": ("blank.pdf", b"%PDF-1.4 empty", "application/pdf")}
        resp = await authed_client.post("/api/analyze", files=files)

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    frames = _parse_sse(resp.text)
    event_types = [e for e, _ in frames]
    assert "error" in event_types
    error_data = next(d for e, d in frames if e == "error")
    assert "Could not extract text" in error_data


@pytest.mark.asyncio
async def test_corrupt_pdf_emits_error_event(authed_client: AsyncClient):
    """A non-ValueError from the parser must still produce a readable error event."""
    files = {"file": ("broken.pdf", b"%PDF-1.4 garbage bytes not a real pdf", "application/pdf")}
    resp = await authed_client.post("/api/analyze", files=files)

    assert resp.status_code == 200
    frames = _parse_sse(resp.text)
    error_data = next(d for e, d in frames if e == "error")
    assert "corrupt" in error_data


@pytest.mark.asyncio
async def test_happy_path_stubbed_pipeline(authed_client: AsyncClient):
    stub_response = PipelineResponse(
        validated=[
            ValidatedJobResult(
                job_title="Backend Engineer",
                company_name="Acme",
                job_url="https://example.com/jobs/1",
                organisation_tier="startup",
                description="Build APIs",
                posted_date=date(2026, 8, 1),
                alignment_score=88,
                justification="Strong Python and FastAPI match.",
            )
        ],
        unscored=[],
        warnings=["No job listings were found from the search results."],
    )

    async def fake_pipeline(resume_text: str, progress_cb):
        await progress_cb("Generating dorking queries...")
        await progress_cb("Searching job boards in parallel...")
        return stub_response

    with (
        patch("routers.analyze.extract_text", return_value="Jane Doe\nPython engineer"),
        patch("routers.analyze.run_pipeline", new=AsyncMock(side_effect=fake_pipeline)),
    ):
        files = {"file": ("resume.txt", b"Jane Doe\nPython engineer", "text/plain")}
        resp = await authed_client.post("/api/analyze", files=files)

    assert resp.status_code == 200
    frames = _parse_sse(resp.text)
    event_types = [e for e, _ in frames]

    assert "progress" in event_types
    assert "warning" in event_types
    assert "done" in event_types
    assert "error" not in event_types

    # Frame format: each original chunk must have event + data (verified by parser)
    for event_type, data in frames:
        assert event_type
        assert data.startswith("{")

    done_data = next(d for e, d in frames if e == "done")
    assert "Backend Engineer" in done_data
    assert "No job listings were found" in done_data


@pytest.mark.asyncio
async def test_analyze_rate_limit_returns_429(authed_client: AsyncClient):
    files = {"file": ("resume.docx", b"nope", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    with patch("routers.analyze.settings.resume_upload_limit", 2):
        first = await authed_client.post("/api/analyze", files=files)
        second = await authed_client.post("/api/analyze", files=files)
        third = await authed_client.post("/api/analyze", files=files)

    assert first.status_code == 400
    assert second.status_code == 400
    assert third.status_code == 429
    assert "Upload limit reached" in third.json()["detail"]
    assert third.headers.get("retry-after")


@pytest.mark.asyncio
async def test_analyze_rate_limit_is_per_user(client: AsyncClient):
    files = {"file": ("resume.docx", b"nope", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    token_a = create_access_token(User(sub="user-a", email="a@example.com", name="A"))
    token_b = create_access_token(User(sub="user-b", email="b@example.com", name="B"))

    with patch("routers.analyze.settings.resume_upload_limit", 1):
        client.cookies.set(COOKIE_NAME, token_a)
        first_a = await client.post("/api/analyze", files=files)
        blocked_a = await client.post("/api/analyze", files=files)

        client.cookies.set(COOKIE_NAME, token_b)
        first_b = await client.post("/api/analyze", files=files)

    assert first_a.status_code == 400
    assert blocked_a.status_code == 429
    assert first_b.status_code == 400
