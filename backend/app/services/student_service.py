"""
MindCheck — Student Service.

Pure business logic for student profile operations.
Executes database calls inside a ThreadPoolExecutor because the Supabase Python SDK is synchronous (§4.4).
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID

from app.repositories.student_repo import StudentRepository

logger = logging.getLogger("mindcheck.services.student")

# Thread pool for synchronous DB/Auth API calls
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="student")


class StudentService:
    """Business logic for student profile management."""

    def __init__(self):
        self._repo = StudentRepository()

    async def delete_student_account(self, student_id: UUID) -> bool:
        """
        Delete student profile and authentication record.
        Runs asynchronously on a separate thread pool to prevent blocking the event loop (§4.4).
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _executor,
            self._repo.delete_student_account,
            student_id,
        )
