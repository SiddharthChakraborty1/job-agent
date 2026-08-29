"""Firebase Admin / Firestore bootstrap."""

from __future__ import annotations

import json
import logging
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore

from config import settings

logger = logging.getLogger(__name__)

_app: firebase_admin.App | None = None
_db: firestore.Client | None = None


def _credential_dict() -> dict[str, Any] | None:
    if settings.firebase_credentials_json:
        try:
            data = json.loads(settings.firebase_credentials_json)
        except json.JSONDecodeError:
            logger.error("FIREBASE_CREDENTIALS_JSON is not valid JSON")
            return None
        if not isinstance(data, dict):
            logger.error("FIREBASE_CREDENTIALS_JSON must be a JSON object")
            return None
        return data

    if not settings.firebase_configured:
        return None

    return {
        "type": "service_account",
        "project_id": settings.firebase_project_id,
        "private_key": settings.firebase_private_key,
        "client_email": settings.firebase_client_email,
        "token_uri": "https://oauth2.googleapis.com/token",
    }


def init_firebase() -> bool:
    """Initialize Firebase Admin once. Returns True when Firestore is ready."""
    global _app, _db

    if _db is not None:
        return True

    if not settings.firebase_configured:
        logger.warning(
            "Firestore not configured (set FIREBASE_PROJECT_ID + "
            "FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or FIREBASE_CREDENTIALS_JSON). "
            "Search history will not persist to the cloud."
        )
        return False

    cred_dict = _credential_dict()
    if cred_dict is None:
        return False

    try:
        if not firebase_admin._apps:
            _app = firebase_admin.initialize_app(
                credentials.Certificate(cred_dict),
                {"projectId": cred_dict.get("project_id") or settings.firebase_project_id},
            )
        else:
            _app = firebase_admin.get_app()
        _db = firestore.client()
        logger.info("Firestore ready (project=%s)", cred_dict.get("project_id"))
        return True
    except Exception:
        logger.exception("Failed to initialize Firebase Admin")
        _app = None
        _db = None
        return False


def get_db() -> firestore.Client | None:
    if _db is None:
        init_firebase()
    return _db


def is_firestore_ready() -> bool:
    return get_db() is not None
