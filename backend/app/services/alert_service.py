"""
MindCheck — Alert Detection Service.

Business logic for detecting emotional risk patterns (RF-08).
Evaluates journal entries against risk thresholds to trigger alerts.

Risk levels and actions:
- Bajo: No alert. Suggest preventive resources.
- Moderado: Push notification to student with support resources.
- Alto: Alert student + suggest contacting bienestar.
- Crítico: Immediate alert to bienestar team + emergency resources.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID

from app.repositories.journal_repo import JournalRepository

logger = logging.getLogger("mindcheck.services.alerts")

_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="alerts")


class AlertDetectionService:
    """Detects risk patterns in journal entries and triggers alerts."""

    # Risk thresholds — validated with psychologists before deployment
    MODERATE_THRESHOLD = 3  # 3+ negative entries in 7 days
    HIGH_THRESHOLD = 5      # 5+ negative entries in 7 days
    CONSECUTIVE_DAYS = 7

    def __init__(self):
        self._repo = JournalRepository()

    async def detect_risk_pattern_in_entries(
        self, student_id: UUID, latest_analysis: dict | None = None
    ) -> dict | None:
        """
        Evaluate the student's recent entries for risk patterns.
        Returns an alert dict if a pattern is detected, None otherwise.
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
            self._repo.count_negative_entries_in_period,
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
