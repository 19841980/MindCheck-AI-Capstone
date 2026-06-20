"""
MindCheck — Push API Router.

Orchestrates HTTP requests for registering and unregistering Web Push subscriptions.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_authenticated_student_id
from app.core.config import get_settings
from app.schemas.notifications import PushSubscriptionCreate
from app.services.push_subscription_service import PushSubscriptionService

logger = logging.getLogger("mindcheck.routers.push")

router = APIRouter(prefix="/api/v1/push", tags=["Push Notifications"])


# --- Dependency Injection ---

def get_push_subscription_service() -> PushSubscriptionService:
    """Dependency injection for PushSubscriptionService."""
    return PushSubscriptionService()


# --- Endpoints ---

@router.post("/subscribe", status_code=status.HTTP_200_OK)
async def subscribe_push(
    payload: PushSubscriptionCreate,
    student_id: UUID = Depends(get_authenticated_student_id),
    push_service: PushSubscriptionService = Depends(get_push_subscription_service),
):
    """
    Register or update a Web Push notification subscription for the student (RF-09).
    """
    try:
        sub = await push_service.register_subscription(
            student_id=student_id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
        )
        return {"status": "success", "subscription_id": sub["id"]}
    except Exception as exc:
        logger.error("Failed to subscribe push: %s", str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar la suscripción en este navegador.",
        )


@router.post("/unsubscribe", status_code=status.HTTP_200_OK)
async def unsubscribe_push(
    payload: dict,
    student_id: UUID = Depends(get_authenticated_student_id),
    push_service: PushSubscriptionService = Depends(get_push_subscription_service),
):
    """
    Unregister/delete a Web Push notification subscription for the student (RF-09).
    """
    endpoint = payload.get("endpoint")
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Falta el campo 'endpoint' en la solicitud.",
        )

    try:
        deleted = await push_service.delete_subscription(
            endpoint=endpoint,
            student_id=student_id,
        )
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La suscripción no fue encontrada para este usuario.",
            )
        return {"status": "success", "message": "Suscripción eliminada."}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to unsubscribe push: %s", str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo eliminar la suscripción push.",
        )


@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """
    Retrieve the configured VAPID public key dynamically (RF-09).
    This is required by the client browser pushManager.subscribe() method.
    """
    settings = get_settings()
    return {"public_key": settings.vapid_public_key or None}
