"""Pytest bootstrap — set required env vars before any backend module imports Settings."""

import os
import sys
from pathlib import Path

# Ensure backend/ is on the path so `import main`, `import routers`, etc. work.
BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("OPENAI_API_KEY", "test-key-not-real")
os.environ.setdefault("COSTLY_MODEL", "gpt-4o")
os.environ.setdefault("CHEAP_MODEL", "gpt-4o-mini")
os.environ.setdefault("SERPER_API_KEY", "test-serper-key-not-real")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id.apps.googleusercontent.com")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-not-for-production")
