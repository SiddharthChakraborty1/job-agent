"""Admin-only endpoints for user and search inspection."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status

from dependencies.auth import get_current_admin
from models.auth import User
from models.persistence import AdminUserDetail, AdminUserSummary, SavedRunOut, SavedRunSummary
from routers.persistence import _require_firestore, _run_to_out
import services.firestore_store as firestore_store

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserSummary])
async def admin_list_users(_admin: User = Depends(get_current_admin)):
    _require_firestore()
    rows = await asyncio.to_thread(firestore_store.list_users_for_admin)
    return [AdminUserSummary(**row) for row in rows]


@router.get("/users/{user_sub}", response_model=AdminUserDetail)
async def admin_user_detail(user_sub: str, _admin: User = Depends(get_current_admin)):
    _require_firestore()
    data = await asyncio.to_thread(firestore_store.get_user_for_admin, user_sub)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    runs = [SavedRunSummary(**row) for row in (data.get("runs") or [])]
    return AdminUserDetail(
        sub=str(data.get("sub") or user_sub),
        email=str(data.get("email") or ""),
        name=str(data.get("name") or ""),
        picture=data.get("picture"),
        preferredCities=list(data.get("preferredCities") or []),
        lastLoginAt=data.get("lastLoginAt"),
        createdAt=data.get("createdAt"),
        searchCount=int(data.get("searchCount") or 0),
        lastSearchAt=data.get("lastSearchAt"),
        runs=runs,
    )


@router.get("/users/{user_sub}/runs/{run_id}", response_model=SavedRunOut)
async def admin_user_run(
    user_sub: str,
    run_id: str,
    _admin: User = Depends(get_current_admin),
):
    _require_firestore()
    data = await asyncio.to_thread(firestore_store.get_run, user_sub, run_id)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found.")
    return _run_to_out(data)
