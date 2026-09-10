"""Persist search runs and application statuses in Firestore."""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from models.auth import User
from services.firebase import get_db

logger = logging.getLogger(__name__)

APPLICATION_STATUSES = frozenset(
    {"not_applied", "applied", "interviewing", "rejected"}
)


def _users():
    db = get_db()
    if db is None:
        return None
    return db.collection("users")


def _url_doc_id(job_url: str) -> str:
    return hashlib.sha256(job_url.encode("utf-8")).hexdigest()[:40]


def _all_urls(validated: list[dict], unscored: list[dict]) -> list[str]:
    urls: list[str] = []
    for job in validated + unscored:
        url = job.get("job_url")
        if isinstance(url, str) and url:
            urls.append(url)
    return urls


def diff_new_job_urls(
    previous: dict[str, Any] | None,
    validated: list[dict],
    unscored: list[dict],
) -> tuple[list[str], int | None]:
    if previous is None:
        return [], None
    prior = set(_all_urls(previous.get("validated") or [], previous.get("unscored") or []))
    fresh = [url for url in _all_urls(validated, unscored) if url not in prior]
    return fresh, len(fresh)


def get_latest_run(user_sub: str) -> dict[str, Any] | None:
    users = _users()
    if users is None:
        return None
    query = (
        users.document(user_sub)
        .collection("runs")
        .order_by("savedAt", direction="DESCENDING")
        .limit(1)
    )
    docs = list(query.stream())
    if not docs:
        return None
    data = docs[0].to_dict() or {}
    data["id"] = docs[0].id
    return data


def list_runs(user_sub: str, limit: int = 20) -> list[dict[str, Any]]:
    users = _users()
    if users is None:
        return []
    limit = max(1, min(limit, 50))
    query = (
        users.document(user_sub)
        .collection("runs")
        .order_by("savedAt", direction="DESCENDING")
        .limit(limit)
    )
    out: list[dict[str, Any]] = []
    for doc in query.stream():
        data = doc.to_dict() or {}
        validated = data.get("validated") or []
        unscored = data.get("unscored") or []
        out.append(
            {
                "id": doc.id,
                "savedAt": data.get("savedAt"),
                "cities": data.get("cities") or [],
                "validatedCount": len(validated) if isinstance(validated, list) else 0,
                "unscoredCount": len(unscored) if isinstance(unscored, list) else 0,
                "newSinceLastCount": data.get("newSinceLastCount"),
                "warnings": data.get("warnings") or [],
            }
        )
    return out


def get_run(user_sub: str, run_id: str) -> dict[str, Any] | None:
    users = _users()
    if users is None:
        return None
    # Guard against path traversal-style ids
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", run_id):
        return None
    doc = users.document(user_sub).collection("runs").document(run_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    data["id"] = doc.id
    return data


def save_run(
    user_sub: str,
    *,
    cities: list[str],
    validated: list[dict],
    unscored: list[dict],
    warnings: list[str],
    skill_gaps: list[dict],
) -> dict[str, Any]:
    """Save a completed search. Computes new-vs-previous delta. Raises if Firestore down."""
    users = _users()
    if users is None:
        raise RuntimeError("Firestore is not configured")

    previous = get_latest_run(user_sub)
    new_job_urls, new_since_last_count = diff_new_job_urls(previous, validated, unscored)
    saved_at = datetime.now(timezone.utc).isoformat()
    run_id = uuid4().hex

    payload = {
        "savedAt": saved_at,
        "cities": cities,
        "validated": validated,
        "unscored": unscored,
        "warnings": warnings,
        "skillGaps": skill_gaps,
        "newJobUrls": new_job_urls,
        "newSinceLastCount": new_since_last_count,
    }
    users.document(user_sub).collection("runs").document(run_id).set(payload)
    logger.info(
        "Saved run %s for user %s (%s validated, %s new)",
        run_id,
        user_sub,
        len(validated),
        new_since_last_count,
    )
    return {"id": run_id, **payload}


def get_statuses(user_sub: str) -> dict[str, str]:
    users = _users()
    if users is None:
        return {}
    out: dict[str, str] = {}
    for doc in users.document(user_sub).collection("statuses").stream():
        data = doc.to_dict() or {}
        url = data.get("jobUrl")
        status = data.get("status")
        if isinstance(url, str) and status in APPLICATION_STATUSES and status != "not_applied":
            out[url] = status
    return out


def set_status(user_sub: str, job_url: str, status: str) -> dict[str, str]:
    users = _users()
    if users is None:
        raise RuntimeError("Firestore is not configured")
    if status not in APPLICATION_STATUSES:
        raise ValueError(f"Invalid status: {status}")

    job_url = job_url.strip()
    if not job_url or len(job_url) > 2000:
        raise ValueError("Invalid job URL")

    ref = users.document(user_sub).collection("statuses").document(_url_doc_id(job_url))
    if status == "not_applied":
        ref.delete()
    else:
        ref.set(
            {
                "jobUrl": job_url,
                "status": status,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }
        )
    return get_statuses(user_sub)


def save_preferred_cities(user_sub: str, cities: list[str]) -> None:
    users = _users()
    if users is None:
        return
    users.document(user_sub).set(
        {
            "preferredCities": cities,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        },
        merge=True,
    )


def upsert_user_profile(user: User, *, touch_login: bool = True) -> None:
    """Create or refresh the user profile document on sign-in."""
    users = _users()
    if users is None:
        return
    now = datetime.now(timezone.utc).isoformat()
    ref = users.document(user.sub)
    payload: dict[str, Any] = {
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "updatedAt": now,
    }
    if touch_login:
        payload["lastLoginAt"] = now
    doc = ref.get()
    if not doc.exists:
        payload["createdAt"] = now
    else:
        existing = doc.to_dict() or {}
        if not existing.get("createdAt"):
            payload["createdAt"] = now
    ref.set(payload, merge=True)


def _cities_from_doc(data: dict[str, Any]) -> list[str]:
    cities = data.get("preferredCities") or []
    if not isinstance(cities, list):
        return []
    return [c for c in cities if isinstance(c, str) and c.strip()]


def _as_iso(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value
    iso = getattr(value, "isoformat", None)
    if callable(iso):
        try:
            return str(iso())
        except Exception:
            return None
    return None


def _profile_from_doc(user_sub: str, data: dict[str, Any]) -> dict[str, Any]:
    picture = data.get("picture")
    return {
        "sub": user_sub,
        "email": data.get("email") or "",
        "name": data.get("name") or "",
        "picture": picture if isinstance(picture, str) and picture else None,
        "preferredCities": _cities_from_doc(data),
        "lastLoginAt": _as_iso(data.get("lastLoginAt")),
        "createdAt": _as_iso(data.get("createdAt")),
        "searchCount": 0,
        "lastSearchAt": None,
    }


def _apply_run_stat(profile: dict[str, Any], saved_at: Any) -> None:
    profile["searchCount"] = int(profile.get("searchCount") or 0) + 1
    if not isinstance(saved_at, str) or not saved_at:
        return
    prev = profile.get("lastSearchAt")
    if not prev or saved_at > prev:
        profile["lastSearchAt"] = saved_at


def _fill_run_stats_per_user(profiles: dict[str, dict[str, Any]]) -> None:
    users = _users()
    if users is None:
        return
    for sub, profile in profiles.items():
        query = (
            users.document(sub)
            .collection("runs")
            .select(["savedAt"])
            .order_by("savedAt", direction="DESCENDING")
        )
        for doc in query.stream():
            data = doc.to_dict() or {}
            _apply_run_stat(profile, data.get("savedAt"))


def list_users_for_admin() -> list[dict[str, Any]]:
    users = _users()
    db = get_db()
    if users is None or db is None:
        return []

    profiles: dict[str, dict[str, Any]] = {}
    for doc in users.stream():
        profiles[doc.id] = _profile_from_doc(doc.id, doc.to_dict() or {})

    try:
        for run_doc in db.collection_group("runs").select(["savedAt"]).stream():
            parent = run_doc.reference.parent.parent
            if parent is None:
                continue
            sub = parent.id
            if sub not in profiles:
                profiles[sub] = _profile_from_doc(sub, {})
            data = run_doc.to_dict() or {}
            _apply_run_stat(profiles[sub], data.get("savedAt"))
    except Exception:
        logger.exception(
            "collection_group(runs) failed; counting searches per user instead"
        )
        for profile in profiles.values():
            profile["searchCount"] = 0
            profile["lastSearchAt"] = None
        _fill_run_stats_per_user(profiles)

    out = list(profiles.values())
    out.sort(
        key=lambda row: row.get("lastSearchAt") or row.get("lastLoginAt") or "",
        reverse=True,
    )
    return out


def get_user_for_admin(user_sub: str) -> dict[str, Any] | None:
    users = _users()
    if users is None:
        return None
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,128}", user_sub):
        return None

    doc = users.document(user_sub).get()
    data = doc.to_dict() if doc.exists else {}
    profile = _profile_from_doc(user_sub, data or {})
    runs = list_runs(user_sub, limit=50)
    profile["runs"] = runs
    if runs:
        profile["searchCount"] = len(runs)
        profile["lastSearchAt"] = _as_iso(runs[0].get("savedAt"))
    else:
        profile["searchCount"] = 0
        profile["lastSearchAt"] = None

    if not doc.exists and not runs:
        return None
    return profile


def get_preferred_cities(user_sub: str) -> list[str]:
    users = _users()
    if users is None:
        return []
    doc = users.document(user_sub).get()
    if not doc.exists:
        return []
    data = doc.to_dict() or {}
    return _cities_from_doc(data)
