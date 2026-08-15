from datetime import datetime, timedelta, timezone

import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from config import settings
from models.auth import User

GOOGLE_REQUEST = google_requests.Request()
COOKIE_NAME = "access_token"


def verify_google_credential(credential: str) -> User:
    """Verify a Google ID token and return the authenticated user."""
    idinfo = id_token.verify_oauth2_token(
        credential,
        GOOGLE_REQUEST,
        settings.google_client_id,
        clock_skew_in_seconds=60,
    )

    if idinfo.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise ValueError("Invalid token issuer.")

    email = idinfo.get("email")
    if not email or not idinfo.get("email_verified", False):
        raise ValueError("Google account email is not verified.")

    return User(
        sub=idinfo["sub"],
        email=email,
        name=idinfo.get("name") or email,
        picture=idinfo.get("picture"),
    )


def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": user.sub,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> User:
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    return User(
        sub=payload["sub"],
        email=payload["email"],
        name=payload["name"],
        picture=payload.get("picture"),
    )
