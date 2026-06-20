"""
MindCheck — Alert Detection Service.

Business logic for detecting emotional risk patterns (RF-08).
Evaluates journal entries against risk thresholds to trigger alerts.

Now integrates:
- AlertRepository for persisting alerts in Supabase.
- EmailNotificationService for sending critical alert emails.

Risk levels and actions:
- Bajo: No alert. Suggest preventive resources.
- Moderado: Push notification to student with support resources.
- Alto: Alert student + suggest contacting bienestar.
- Crítico: Immediate alert to bienestar team + emergency resources + email.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID

from app.repositories.journal_repo import JournalRepository
from app.repositories.alert_repo import AlertRepository
from app.services.email_service import send_critical_alert_email
from app.services.push_notification_service import PushNotificationService

logger = logging.getLogger("mindcheck.services.alerts")

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="alerts")


class AlertDetectionService:
    """Detects risk patterns in journal entries and triggers alerts."""

    # Risk thresholds — validated with psychologists before deployment
    MODERATE_THRESHOLD = 3  # 3+ negative entries in 7 days
    HIGH_THRESHOLD = 5      # 5+ negative entries in 7 days
    CONSECUTIVE_DAYS = 7

    def __init__(self):
        self._journal_repo = JournalRepository()
        self._alert_repo = AlertRepository()
        self._push_service = PushNotificationService()

    async def detect_risk_pattern_in_entries(
        self,
        student_id: UUID,
        entry_id: UUID | None = None,
        latest_analysis: dict | None = None,
    ) -> dict | None:
        """
        Evaluate the student's recent entries for risk patterns.

        When a pattern is detected:
        1. Persists the alert in the 'alerts' table (immutable).
        2. For 'critico' level, sends an email to the bienestar team.
        3. Returns the full alert record (with id and triggered_at).

        Returns None if no alert is needed.
        """
        alert_data = await self._evaluate_risk_pattern(
            student_id=student_id,
            latest_analysis=latest_analysis,
        )

        if alert_data is None:
            return None

        # Persist the alert in Supabase
        loop = asyncio.get_event_loop()
        alert_record = await loop.run_in_executor(
            _executor,
            self._alert_repo.create_alert,
            student_id,
            entry_id,
            alert_data["alert_type"],
            alert_data["risk_level"],
            alert_data["message"],
        )

        # Trigger push notification to student for moderate, high, or critical alerts
        if alert_data["risk_level"] in ("moderado", "alto", "critico"):
            await loop.run_in_executor(
                _executor,
                self._push_service.send_push_to_student,
                student_id,
                f"Alerta de Bienestar: {alert_data['risk_level'].capitalize()}",
                alert_data["message"],
                {"alert_id": str(alert_record["id"]), "risk_level": alert_data["risk_level"]},
            )

        # For critical/high alerts, send email to bienestar team (best-effort)
        if alert_data["risk_level"] in ("critico", "alto"):
            await self._send_bienestar_notification(
                alert_record=alert_record,
                student_id=student_id,
            )

        return alert_record

    async def _evaluate_risk_pattern(
        self,
        student_id: UUID,
        latest_analysis: dict | None = None,
    ) -> dict | None:
        """
        Pure evaluation logic — determines if an alert should be triggered.
        Does NOT persist anything.
        """
        # Check for critical indicators in the latest analysis
        if latest_analysis and latest_analysis.get("crisis_indicators"):
            logger.warning(
                "CRITICAL: Crisis indicators detected.",
                extra={"student_id_hash": hash(str(student_id))},
            )
            return {
                "alert_type": "critico",
                "risk_level": "critico",
                "message": (
                    "Se detectaron indicadores que requieren atención inmediata. "
                    "Un profesional de bienestar ha sido notificado."
                ),
                "action": "notify_bienestar_team",
            }

        # Count negative entries in the last 7 days (sync repo → executor)
        loop = asyncio.get_event_loop()
        negative_count = await loop.run_in_executor(
            _executor,
            self._journal_repo.count_negative_entries_in_period,
            student_id,
            self.CONSECUTIVE_DAYS,
        )

        if negative_count >= self.HIGH_THRESHOLD:
            return {
                "alert_type": "alto",
                "risk_level": "alto",
                "message": (
                    f"{negative_count} registros negativos esta semana. "
                    "Te sugerimos contactar al equipo de bienestar de Duoc UC."
                ),
                "action": "alert_student_and_suggest_contact",
            }

        if negative_count >= self.MODERATE_THRESHOLD:
            return {
                "alert_type": "moderado",
                "risk_level": "moderado",
                "message": (
                    f"{negative_count} registros negativos esta semana. "
                    "¿Te gustaría hablar con alguien?"
                ),
                "action": "push_notification_with_resources",
            }

        return None  # No alert needed

    async def _send_bienestar_notification(
        self,
        alert_record: dict,
        student_id: UUID,
    ) -> None:
        """
        Send email notification to bienestar team for critical/high alerts.
        Best-effort: if email fails, the alert is still persisted.

        Privacy (§5.1): retrieves student metadata (sede, carrera) from
        the students table — never emotional content.
        """
        # Fetch student metadata for the email (sede, carrera only — never emotional data)
        loop = asyncio.get_event_loop()
        try:
            student_meta = await loop.run_in_executor(
                _executor,
                self._fetch_student_metadata,
                student_id,
            )
        except Exception:
            student_meta = {"sede": "No disponible", "carrera": "No disponible"}

        await send_critical_alert_email(
            risk_level=alert_record.get("risk_level", "critico"),
            sede=student_meta.get("sede", "No disponible"),
            carrera=student_meta.get("carrera", "No disponible"),
            alert_id=alert_record.get("id", "unknown"),
        )

    def _fetch_student_metadata(self, student_id: UUID) -> dict:
        """
        Fetch student's sede and carrera for the email notification.
        Only non-sensitive metadata — never emotional data (§5.1).
        """
        from app.repositories.supabase_client import get_supabase_client

        client = get_supabase_client()
        try:
            result = (
                client.table("students")
                .select("sede, carrera")
                .eq("id", str(student_id))
                .maybe_single()
                .execute()
            )
            return result.data or {"sede": "No disponible", "carrera": "No disponible"}
        except Exception:
            logger.warning(
                "Could not fetch student metadata for email.",
                extra={"student_id_hash": hash(str(student_id))},
            )
            return {"sede": "No disponible", "carrera": "No disponible"}
