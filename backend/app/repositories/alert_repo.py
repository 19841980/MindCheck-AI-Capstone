"""
MindCheck — Alert Repository.

Unique point of access to the 'alerts' table in Supabase/PostgreSQL.
No other layer queries the alerts table directly.

Per immutability rules:
- Alerts are IMMUTABLE once created.
- The ONLY allowed update is setting 'acknowledged_at' and 'acknowledged_by'.
- Alerts can never be deleted by students (only cascade on account deletion).
"""

import logging
from uuid import UUID

from app.repositories.supabase_client import get_supabase_client

logger = logging.getLogger("mindcheck.repo.alerts")


class AlertRepository:
    """Repository for the alerts table."""

    def __init__(self):
        self._client = get_supabase_client()

    def create_alert(
        self,
        student_id: UUID,
        entry_id: UUID | None,
        alert_type: str,
        risk_level: str,
        message: str,
    ) -> dict:
        """
        Insert a new immutable alert record.
        Returns the created alert with its generated id and triggered_at.
        """
        row = {
            "student_id": str(student_id),
            "alert_type": alert_type,
            "risk_level": risk_level,
            "message": message,
        }
        if entry_id is not None:
            row["entry_id"] = str(entry_id)

        result = (
            self._client.table("alerts")
            .insert(row)
            .execute()
        )

        if not result.data:
            logger.error(
                "Failed to create alert.",
                extra={"student_id_hash": hash(str(student_id))},
            )
            raise RuntimeError("No se pudo guardar la alerta.")

        logger.info(
            "Alert created.",
            extra={
                "alert_id": result.data[0]["id"],
                "alert_type": alert_type,
                "risk_level": risk_level,
            },
        )
        return result.data[0]

    def get_alerts_by_student(
        self,
        student_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict]:
        """
        Retrieve alerts for a student, ordered by most recent first.
        """
        result = (
            self._client.table("alerts")
            .select("*")
            .eq("student_id", str(student_id))
            .order("triggered_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data or []

    def get_unacknowledged_count(self, student_id: UUID) -> int:
        """
        Count unacknowledged alerts for a student.
        Used for the notification badge in the frontend.
        """
        result = (
            self._client.table("alerts")
            .select("id", count="exact")
            .eq("student_id", str(student_id))
            .is_("acknowledged_at", "null")
            .execute()
        )
        return result.count or 0

    def acknowledge_alert(
        self,
        alert_id: UUID,
        student_id: UUID,
    ) -> dict | None:
        """
        Mark an alert as acknowledged (the ONLY allowed update).
        Enforces ownership: only the owning student can acknowledge.
        Returns the updated record, or None if not found / not owned.
        """
        result = (
            self._client.table("alerts")
            .update({"acknowledged_at": "now()"})
            .eq("id", str(alert_id))
            .eq("student_id", str(student_id))
            .is_("acknowledged_at", "null")
            .execute()
        )

        if not result.data:
            return None

        logger.info(
            "Alert acknowledged.",
            extra={"alert_id": str(alert_id)},
        )
        return result.data[0]
