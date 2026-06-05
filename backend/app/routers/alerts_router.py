"""
MindCheck — Alerts API Router.

Endpoints for student alert management.
All endpoints require JWT authentication.

Alerts are immutable — they can only be:
- Listed (GET)
- Acknowledged (PATCH) — marks as read, never deleted.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query

from app.core.security import get_authenticated_student_id
from app.repositories.alert_repo import AlertRepository

logger = logging.getLogger("mindcheck.routers.alerts")

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])


# --- Dependency Injection ---

def get_alert_repo() -> AlertRepository:
    """Dependency injection for AlertRepository."""
    return AlertRepository()


# --- Endpoints ---

@router.get("/")
async def get_student_alerts(
    student_id: UUID = Depends(get_authenticated_student_id),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    alert_repo: AlertRepository = Depends(get_alert_repo),
):
    """
    List alerts for the authenticated student (RF-08).
    Paginated, most recent first.
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    _executor = ThreadPoolExecutor(max_workers=2)
    loop = asyncio.get_event_loop()

    alerts = await loop.run_in_executor(
        _executor,
        alert_repo.get_alerts_by_student,
        student_id,
        limit,
        offset,
    )
    return {"alerts": alerts, "total": len(alerts)}


@router.get("/unread-count")
async def get_unread_alert_count(
    student_id: UUID = Depends(get_authenticated_student_id),
    alert_repo: AlertRepository = Depends(get_alert_repo),
):
    """
    Get the count of unacknowledged alerts for the notification badge.
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    _executor = ThreadPoolExecutor(max_workers=2)
    loop = asyncio.get_event_loop()

    count = await loop.run_in_executor(
        _executor,
        alert_repo.get_unacknowledged_count,
        student_id,
    )
    return {"unread_count": count}


@router.patch("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: UUID,
    student_id: UUID = Depends(get_authenticated_student_id),
    alert_repo: AlertRepository = Depends(get_alert_repo),
):
    """
    Mark an alert as acknowledged (read).
    Only the owning student can acknowledge their own alerts.
    This is the ONLY allowed mutation on alerts.
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    _executor = ThreadPoolExecutor(max_workers=2)
    loop = asyncio.get_event_loop()

    result = await loop.run_in_executor(
        _executor,
        alert_repo.acknowledge_alert,
        alert_id,
        student_id,
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Alerta no encontrada o ya fue reconocida.",
        )

    return result
