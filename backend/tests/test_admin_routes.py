"""Admin routes require an allowlisted Google account."""

from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from models.auth import User
from main import app
from services.auth import COOKIE_NAME, create_access_token, is_admin_email


@pytest.fixture
def admin_emails(monkeypatch):
    emails = frozenset({"admin@example.com"})
    monkeypatch.setattr("config.settings.admin_emails", emails)
    return emails


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


def _token(email: str, sub: str = "user-1") -> str:
    return create_access_token(User(sub=sub, email=email, name="Tester"))


def test_is_admin_email(admin_emails):
    assert is_admin_email("admin@example.com")
    assert is_admin_email("Admin@Example.com")
    assert not is_admin_email("user@example.com")
    assert not is_admin_email("")


@pytest.mark.asyncio
async def test_admin_users_requires_auth(client: AsyncClient):
    resp = await client.get("/api/admin/users")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_users_forbids_non_admin(client: AsyncClient, admin_emails):
    client.cookies.set(COOKIE_NAME, _token("user@example.com"))
    resp = await client.get("/api/admin/users")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_list_users(client: AsyncClient, admin_emails):
    stub = [
        {
            "sub": "abc",
            "email": "jane@example.com",
            "name": "Jane",
            "picture": None,
            "preferredCities": ["Pune"],
            "lastLoginAt": "2026-09-10T10:00:00+00:00",
            "createdAt": "2026-09-01T10:00:00+00:00",
            "searchCount": 3,
            "lastSearchAt": "2026-09-10T12:00:00+00:00",
        }
    ]
    client.cookies.set(COOKIE_NAME, _token("admin@example.com", sub="admin-1"))
    with (
        patch("routers.admin._require_firestore"),
        patch("routers.admin.firestore_store.list_users_for_admin", return_value=stub) as mocked,
    ):
        resp = await client.get("/api/admin/users")

    assert resp.status_code == 200
    mocked.assert_called_once()
    body = resp.json()
    assert body[0]["email"] == "jane@example.com"
    assert body[0]["searchCount"] == 3


@pytest.mark.asyncio
async def test_admin_user_detail_and_run(client: AsyncClient, admin_emails):
    detail = {
        "sub": "abc",
        "email": "jane@example.com",
        "name": "Jane",
        "picture": None,
        "preferredCities": [],
        "lastLoginAt": "2026-09-10T10:00:00+00:00",
        "createdAt": "2026-09-01T10:00:00+00:00",
        "searchCount": 1,
        "lastSearchAt": "2026-09-10T12:00:00+00:00",
        "runs": [
            {
                "id": "run1",
                "savedAt": "2026-09-10T12:00:00+00:00",
                "cities": ["Pune"],
                "validatedCount": 2,
                "unscoredCount": 1,
                "newSinceLastCount": None,
                "warnings": [],
            }
        ],
    }
    run = {
        "id": "run1",
        "savedAt": "2026-09-10T12:00:00+00:00",
        "cities": ["Pune"],
        "validated": [],
        "unscored": [],
        "warnings": [],
        "skillGaps": [],
        "newJobUrls": [],
        "newSinceLastCount": None,
    }
    client.cookies.set(COOKIE_NAME, _token("admin@example.com", sub="admin-1"))
    with (
        patch("routers.admin._require_firestore"),
        patch("routers.admin.firestore_store.get_user_for_admin", return_value=detail),
        patch("routers.admin.firestore_store.get_run", return_value=run),
    ):
        user_resp = await client.get("/api/admin/users/abc")
        run_resp = await client.get("/api/admin/users/abc/runs/run1")

    assert user_resp.status_code == 200
    assert user_resp.json()["runs"][0]["id"] == "run1"
    assert run_resp.status_code == 200
    assert run_resp.json()["id"] == "run1"


@pytest.mark.asyncio
async def test_me_sets_is_admin(client: AsyncClient, admin_emails):
    client.cookies.set(COOKIE_NAME, _token("admin@example.com", sub="admin-1"))
    with patch("routers.auth.is_firestore_ready", return_value=False):
        resp = await client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["isAdmin"] is True
