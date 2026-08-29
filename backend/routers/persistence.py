"""Authenticated endpoints for Firestore-backed search history and statuses."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from dependencies.auth import get_current_user
from models.auth import User
from models.persistence import (
    PreferredCitiesOut,
    PreferredCitiesUpdate,
    SavedRunOut,
    SavedRunSummary,
    StatusMap,
    StatusUpdate,
)
from services.firestore_store import (
    get_preferred_cities,
    get_latest_run,
    get_run,
    get_statuses,
    list_runs,
    save_preferred_cities,
    set_status,
)
from services.firebase import is_firestore_ready

logger = logging.getLogger(__name__)

router = APIRouter(tags=["persistence"])


def _require_firestore() -> None:
    if not is_firestore_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloud storage is not configured on the server.",
        )


def _run_to_out(data: dict) -> SavedRunOut:
    return SavedRunOut(
        id=str(data.get("id") or ""),
        savedAt=str(data.get("savedAt") or ""),
        cities=list(data.get("cities") or []),
        validated=data.get("validated") or [],
        unscored=data.get("unscored") or [],
        warnings=list(data.get("warnings") or []),
        skillGaps=data.get("skillGaps") or [],
        newJobUrls=list(data.get("newJobUrls") or []),
        newSinceLastCount=data.get("newSinceLastCount"),
    )


@router.get("/runs/latest", response_model=SavedRunOut | None)
async def get_latest_run(user: User = Depends(get_current_user)):
    _require_firestore()
    data = await asyncio.to_thread(get_latest_run, user.sub)
    if data is None:
        return None
    return _run_to_out(data)


@router.get("/runs", response_model=list[SavedRunSummary])
async def list_runs(
    user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=50),
):
    _require_firestore()
    rows = await asyncio.to_thread(list_runs, user.sub, limit)
    return [SavedRunSummary(**row) for row in rows]


@router.get("/runs/{run_id}", response_model=SavedRunOut)
async def get_run(run_id: str, user: User = Depends(get_current_user)):
    _require_firestore()
    data = await asyncio.to_thread(get_run, user.sub, run_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Run not found.")
    return _run_to_out(data)


@router.get("/statuses", response_model=StatusMap)
async def get_statuses(user: User = Depends(get_current_user)):
    _require_firestore()
    statuses = await asyncio.to_thread(get_statuses, user.sub)
    return StatusMap(statuses=statuses)  # type: ignore[arg-type]


@router.put("/statuses", response_model=StatusMap)
async def put_status(body: StatusUpdate, user: User = Depends(get_current_user)):
    _require_firestore()
    try:
        statuses = await asyncio.to_thread(
            set_status, user.sub, body.job_url, body.status
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return StatusMap(statuses=statuses)  # type: ignore[arg-type]


@router.get("/preferences/cities", response_model=PreferredCitiesOut)
async def get_cities(user: User = Depends(get_current_user)):
    _require_firestore()
    cities = await asyncio.to_thread(get_preferred_cities, user.sub)
    return PreferredCitiesOut(cities=cities)


@router.put("/preferences/cities", response_model=PreferredCitiesOut)
async def put_cities(body: PreferredCitiesUpdate, user: User = Depends(get_current_user)):
    _require_firestore()
    cities = [c.strip() for c in body.cities if isinstance(c, str) and c.strip()][:5]
    await asyncio.to_thread(save_preferred_cities, user.sub, cities)
    return PreferredCitiesOut(cities=cities)
