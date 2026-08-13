import jwt
from fastapi import Cookie, HTTPException, status

from models.auth import User
from services.auth import COOKIE_NAME, decode_access_token


async def get_current_user(
    access_token: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> User:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )

    try:
        return decode_access_token(access_token)
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        ) from None
