"""
MindCheck — Push Subscription Service.

Business logic for managing web push notification subscriptions.
Executes database calls inside a ThreadPoolExecutor because the Supabase Python SDK is synchronous (§4.4).
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID

from app.repositories.push_subscription_repo import PushSubscriptionRepository

logger = logging.getLogger("mindcheck.services.push_subscriptions")

# Thread pool for synchronous DB operations
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="push_sub")


class PushSubscriptionService:
    """Business logic for push subscription management."""

    def __init__(self):
        self._repo = PushSubscriptionRepository()

    async def register_subscription(
        self,
        student_id: UUID,
        endpoint: str,
        p256dh: str,
        auth: str,
    ) -> dict:
        """Register or update a push subscription for a student."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _executor,
            self._repo.register_subscription,
            student_id,
            endpoint,
            p256dh,
            auth,
        )

    async def delete_subscription(
        self,
        endpoint: str,
        student_id: UUID,
    ) -> bool:
        """Delete a push subscription belonging to the student."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _executor,
            self._repo.delete_subscription,
            endpoint,
            student_id,
        )

    async def get_subscriptions_by_student(self, student_id: UUID) -> list[dict]:
        """Get all subscriptions for a student."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _executor,
            self._repo.get_subscriptions_by_student,
            student_id,
        )
