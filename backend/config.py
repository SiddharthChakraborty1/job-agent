import os
import sys
import logging

from pathlib import Path

from dotenv import load_dotenv

# CWD first, then repo-root .env (uvicorn is started from backend/).
load_dotenv()
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logger = logging.getLogger(__name__)


class Settings:
    def __init__(self):
        self.openai_api_key = self._require("OPENAI_API_KEY")
        self.costly_model = self._require("COSTLY_MODEL")
        self.cheap_model = self._require("CHEAP_MODEL")
        self.serper_api_key = self._require("SERPER_API_KEY")
        self.google_client_id = self._require("GOOGLE_CLIENT_ID")
        self.jwt_secret = self._require("JWT_SECRET")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.jwt_expire_minutes = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
        self.frontend_urls = [
            url.rstrip("/")
            for url in os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")
            if url.strip()
        ]
        self.cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        # Per-user resume upload rate limit (sliding window).
        self.resume_upload_limit = self._optional_int("RESUME_UPLOAD_LIMIT", 5)
        self.resume_upload_window_seconds = self._optional_int(
            "RESUME_UPLOAD_WINDOW_SECONDS", 3600
        )
        # Firestore (optional locally; set on Render for cloud persistence).
        self.firebase_credentials_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "").strip()
        self.firebase_project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
        self.firebase_client_email = os.getenv("FIREBASE_CLIENT_EMAIL", "").strip()
        raw_key = os.getenv("FIREBASE_PRIVATE_KEY", "")
        self.firebase_private_key = raw_key.replace("\\n", "\n").strip() if raw_key else ""

    @property
    def firebase_configured(self) -> bool:
        if self.firebase_credentials_json:
            return True
        return bool(
            self.firebase_project_id
            and self.firebase_client_email
            and self.firebase_private_key
        )

    def _require(self, name: str) -> str:
        value = os.getenv(name)
        if not value:
            logger.error(
                "Required environment variable '%s' is missing or empty.", name
            )
            sys.exit(1)
        return value

    def _optional_int(self, name: str, default: int) -> int:
        raw = os.getenv(name)
        if raw is None or not raw.strip():
            return default
        try:
            return int(raw)
        except ValueError:
            logger.warning(
                "Invalid %s=%r; using default %s.", name, raw, default
            )
            return default


settings = Settings()
