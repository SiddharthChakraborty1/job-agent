import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse

from config import settings
from dependencies.auth import get_current_user
from models.auth import GoogleAuthRequest, User
from services.auth import COOKIE_NAME, create_access_token, verify_google_credential

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_samesite() -> str:
    # Cross-origin frontend (Vercel) + backend (Render) requires SameSite=None + Secure.
    return "none" if settings.cookie_secure else "lax"


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=_cookie_samesite(),
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=settings.cookie_secure,
        samesite=_cookie_samesite(),
    )


@router.post("/google")
async def google_login(body: GoogleAuthRequest, response: Response) -> User:
    try:
        user = verify_google_credential(body.credential)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    except Exception:
        logger.exception("Google credential verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify Google sign-in.",
        ) from None

    token = create_access_token(user)
    _set_auth_cookie(response, token)
    return user


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/logout")
async def logout() -> JSONResponse:
    response = JSONResponse({"ok": True})
    _clear_auth_cookie(response)
    return response
