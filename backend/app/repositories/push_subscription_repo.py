"""
MindCheck — Push Subscription Repository.

Point of access to the 'push_subscriptions' table in Supabase.
No other layer queries this table directly.
"""

import logging
from uuid import UUID
from app.repositories.supabase_client import get_supabase_client

logger = logging.getLogger("mindcheck.repo.push_subscriptions")


class PushSubscriptionRepository:
    """Repository for managing client web push notification subscriptions."""

    def __init__(self):
        self._client = get_supabase_client()

    def register_subscription(
        self,
        student_id: UUID,
        endpoint: str,
        p256dh: str,
        auth: str,
    ) -> dict:
        """
        Register or update a push subscription for a student.
        Since endpoint is UNIQUE, we upsert on conflict of 'endpoint'.
        """
        row = {
            "student_id": str(student_id),
            "endpoint": endpoint,
            "p256dh": p256dh,
            "auth": auth,
            "updated_at": "now()",
        }

        result = (
            self._client.table("push_subscriptions")
            .upsert(row, on_conflict="endpoint")
            .execute()
        )

        if not result.data:
            logger.error(
                "Failed to register push subscription.",
                extra={"student_id_hash": hash(str(student_id))},
            )
            raise RuntimeError("No se pudo registrar la suscripción push.")

        logger.info(
            "Push subscription registered.",
            extra={
                "subscription_id": result.data[0]["id"],
                "student_id_hash": hash(str(student_id)),
            },
        )
        return result.data[0]

    def delete_subscription(
        self,
        endpoint: str,
        student_id: UUID,
    ) -> bool:
        """
        Delete a push subscription.
        Enforces ownership: only the owning student can delete.
        """
        result = (
            self._client.table("push_subscriptions")
            .delete()
            .eq("endpoint", endpoint)
            .eq("student_id", str(student_id))
            .execute()
        )
        deleted = len(result.data) > 0 if result.data else False
        logger.info(
            "Push subscription deleted.",
            extra={
                "endpoint_preview": endpoint[:30] + "...",
                "student_id_hash": hash(str(student_id)),
                "success": deleted,
            },
        )
        return deleted

    def get_subscriptions_by_student(self, student_id: UUID) -> list[dict]:
        """
        Get all push subscriptions registered for a specific student.
        """
        result = (
            self._client.table("push_subscriptions")
            .select("*")
            .eq("student_id", str(student_id))
            .execute()
        )
        return result.data or []
