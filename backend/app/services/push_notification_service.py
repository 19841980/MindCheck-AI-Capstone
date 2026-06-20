"""
MindCheck — Push Notification Delivery Service.

Responsible for sending Web Push notifications to client browsers.
Integrates pywebpush and supports a mock fallback when VAPID keys are missing.
"""

import json
import logging
from uuid import UUID

from app.core.config import get_settings
from app.repositories.push_subscription_repo import PushSubscriptionRepository

logger = logging.getLogger("mindcheck.services.push_notifications")

# Dynamically import pywebpush to support graceful fallback if library is not installed
try:
    from pywebpush import webpush, WebPushException
    PYWEBPUSH_AVAILABLE = True
except ImportError:
    PYWEBPUSH_AVAILABLE = False
    logger.warning("pywebpush is not installed. Push notifications will run in mock mode.")


class PushNotificationService:
    """Service to send web push notifications using VAPID credentials."""

    def __init__(self):
        self._repo = PushSubscriptionRepository()

    def send_push_to_student(
        self,
        student_id: UUID,
        title: str,
        body: str,
        extra_data: dict | None = None,
    ) -> int:
        """
        Send a push notification to all subscriptions of a student.
        Returns the number of successfully sent notifications.
        Runs synchronously (called inside alert executor thread pool).
        """
        subscriptions = self._repo.get_subscriptions_by_student(student_id)
        if not subscriptions:
            logger.info(
                "No push subscriptions found for student.",
                extra={"student_id_hash": hash(str(student_id))},
            )
            return 0

        settings = get_settings()
        payload = {
            "title": title,
            "body": body,
            "data": extra_data or {},
        }
        payload_str = json.dumps(payload)

        # Check VAPID settings validation
        has_vapid = (
            settings.vapid_public_key
            and settings.vapid_private_key
            and settings.vapid_claim_email
        )

        success_count = 0

        for sub in subscriptions:
            # Reconstruct the Web Push subscription object format expected by pywebpush
            sub_info = {
                "endpoint": sub["endpoint"],
                "keys": {
                    "p256dh": sub["p256dh"],
                    "auth": sub["auth"],
                }
            }

            if PYWEBPUSH_AVAILABLE and has_vapid:
                try:
                    webpush(
                        subscription_info=sub_info,
                        data=payload_str,
                        vapid_private_key=settings.vapid_private_key,
                        vapid_claims={"sub": f"mailto:{settings.vapid_claim_email}"},
                    )
                    success_count += 1
                    logger.debug("Push sent successfully to endpoint.")
                except WebPushException as ex:
                    # If subscription is expired or invalid, we should clean it up
                    logger.warning(
                        "Web Push failed. Clean up subscription. Error: %s",
                        str(ex),
                    )
                    # Delete the broken subscription automatically
                    try:
                        self._repo.delete_subscription(sub["endpoint"], student_id)
                    except Exception as clean_ex:
                        logger.error("Failed to clean up stale subscription: %s", str(clean_ex))
            else:
                # Mock Mode (development / missing VAPID keys)
                success_count += 1
                logger.info(
                    "[MOCK PUSH] Sent notification to endpoint: %s\n"
                    "Payload: %s",
                    sub["endpoint"][:50] + "...",
                    payload_str,
                )

        logger.info(
            "Push notification delivery completed.",
            extra={
                "student_id_hash": hash(str(student_id)),
                "subscriptions_found": len(subscriptions),
                "success_count": success_count,
                "mode": "real" if (PYWEBPUSH_AVAILABLE and has_vapid) else "mock",
            },
        )
        return success_count
