"""Ensure persistence routes call the store module (not shadowed handlers)."""

from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from models.auth import User
from main import app
from services.auth import COOKIE_NAME, create_access_token


@pytest.fixture
async def authed_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = create_access_token(
            User(sub="test-user", email="test@example.com", name="Test")
        )
        client.cookies.set(COOKIE_NAME, token)
        yield client


@pytest.mark.asyncio
async def test_list_runs_calls_store_not_self(authed_client: AsyncClient):
    stub = [
        {
            "id": "abc",
            "savedAt": "2026-08-29T10:00:00+00:00",
            "cities": ["Pune"],
            "validatedCount": 2,
            "unscoredCount": 0,
            "newSinceLastCount": 1,
            "warnings": [],
        }
    ]
    with (
        patch("routers.persistence.is_firestore_ready", return_value=True),
        patch("routers.persistence.firestore_store.list_runs", return_value=stub) as mocked,
    ):
        resp = await authed_client.get("/api/runs?limit=10")

    assert resp.status_code == 200
    mocked.assert_called_once_with("test-user", 10)
    body = resp.json()
    assert body[0]["id"] == "abc"
    assert body[0]["validatedCount"] == 2


@pytest.mark.asyncio
async def test_latest_run_calls_store(authed_client: AsyncClient):
    stub = {
        "id": "run1",
        "savedAt": "2026-08-29T10:00:00+00:00",
        "cities": [],
        "validated": [],
        "unscored": [],
        "warnings": [],
        "skillGaps": [],
        "newJobUrls": [],
        "newSinceLastCount": None,
    }
    with (
        patch("routers.persistence.is_firestore_ready", return_value=True),
        patch("routers.persistence.firestore_store.get_latest_run", return_value=stub) as mocked,
    ):
        resp = await authed_client.get("/api/runs/latest")

    assert resp.status_code == 200
    mocked.assert_called_once_with("test-user")
    assert resp.json()["id"] == "run1"
