"""
MindCheck — Student Profile Repository.

Point of access to the students table in Supabase.
Enforces the Right to be Forgotten (RNF-13 / Ley 19.628) by:
1. Deleting the student record from 'public.students'.
2. Calling the Supabase Admin API to delete the authentication record from auth.users.
"""

from uuid import UUID
import logging
from app.repositories.supabase_client import get_supabase_client

logger = logging.getLogger("mindcheck.repo.student")


class StudentRepository:
    """Repository for student-related database operations."""

    def __init__(self):
        self._client = get_supabase_client()

    def delete_student_account(self, student_id: UUID) -> bool:
        """
        Delete student profile from 'public.students' and from Supabase auth.users.
        
        Since foreign keys in journal_entries, sentiment_analysis, and alerts
        have ON DELETE CASCADE, deleting the student profile automatically deletes
        all of their personal emotional records.
        """
        student_id_str = str(student_id)

        # 1. Delete from public.students (will cascade delete entries, analysis, alerts in DB)
        try:
            res_db = (
                self._client.table("students")
                .delete()
                .eq("id", student_id_str)
                .execute()
            )
            db_deleted = len(res_db.data) > 0 if res_db.data else False
        except Exception as exc:
            logger.error(
                "Error deleting student profile from DB: %s",
                str(exc),
                exc_info=True,
            )
            db_deleted = False

        # 2. Delete from auth.users (Supabase Admin Auth API)
        auth_deleted = False
        try:
            res_auth = self._client.auth.admin.delete_user(student_id_str)
            auth_deleted = res_auth is not None
        except Exception as exc:
            logger.error(
                "Failed to delete student from Supabase Auth: %s",
                str(exc),
                exc_info=True,
            )
            auth_deleted = False

        logger.info(
            "Student deletion completed. DB_deleted=%s, Auth_deleted=%s",
            db_deleted,
            auth_deleted,
            extra={"student_id": student_id_str},
        )
        return db_deleted or auth_deleted
