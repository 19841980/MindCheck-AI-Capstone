"""
MindCheck — Email Notification Service.

Async SMTP service for sending critical alert notifications
to the bienestar (wellbeing) team at Duoc UC.

Security & Privacy (§5.1):
- Emails NEVER contain the student's journal text.
- Only metadata is included: risk level, sede, carrera, timestamp, alert ID.
- Student identity is anonymized in the email body.

Technical:
- Uses aiosmtplib for non-blocking SMTP (§4.4 — never block the event loop).
- Implements a simple circuit breaker to avoid SMTP saturation on failures.
- If email fails, the alert is still persisted — email is best-effort.
"""

import logging
from datetime import datetime, timezone

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import get_settings

logger = logging.getLogger("mindcheck.services.email")

# Simple circuit breaker state
_consecutive_failures: int = 0
_MAX_CONSECUTIVE_FAILURES: int = 5


def _build_critical_alert_html(
    risk_level: str,
    sede: str,
    carrera: str,
    timestamp: str,
    alert_id: str,
) -> str:
    """
    Build HTML email body for a critical alert notification.
    Contains ONLY metadata — never the emotional journal text (§5.1).
    """
    risk_color = {
        "critico": "#E63946",
        "alto": "#E76F51",
        "moderado": "#F4A261",
        "bajo": "#40916C",
    }.get(risk_level, "#6C757D")

    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8faf9; padding: 32px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background: {risk_color}; padding: 24px 32px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">
            ⚠️ Alerta Crítica — MindCheck
          </h1>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <p style="color: #1a1d1e; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
            Se ha detectado un estado emocional que requiere <strong>atención inmediata</strong>
            por parte del equipo de bienestar estudiantil.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8e5; color: #5a6268; font-size: 13px; width: 40%;">Nivel de riesgo</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8e5; font-weight: 600; color: {risk_color}; font-size: 14px;">
                {risk_level.upper()}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8e5; color: #5a6268; font-size: 13px;">Sede</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8e5; font-size: 14px; color: #1a1d1e;">{sede}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8e5; color: #5a6268; font-size: 13px;">Carrera</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8e5; font-size: 14px; color: #1a1d1e;">{carrera}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8e5; color: #5a6268; font-size: 13px;">Fecha / Hora</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8e5; font-size: 14px; color: #1a1d1e;">{timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 10px 16px; color: #5a6268; font-size: 13px;">ID de alerta</td>
              <td style="padding: 10px 16px; font-size: 12px; color: #8b9299; font-family: monospace;">{alert_id}</td>
            </tr>
          </table>

          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-top: 20px;">
            <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
              <strong>Acción recomendada:</strong> Contactar al estudiante a la brevedad para
              ofrecer apoyo profesional. Este correo se generó automáticamente por el sistema
              MindCheck al detectar indicadores de riesgo emocional.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f3; padding: 16px 32px; text-align: center;">
          <p style="margin: 0; color: #8b9299; font-size: 11px;">
            MindCheck — Bienestar Mental Estudiantil · Duoc UC
            <br>Este es un mensaje automático. No responder.
          </p>
        </div>
      </div>
    </body>
    </html>
    """


async def send_critical_alert_email(
    risk_level: str,
    sede: str,
    carrera: str,
    alert_id: str,
) -> bool:
    """
    Send an email notification to the bienestar team about a critical alert.

    Returns True if the email was sent successfully, False otherwise.
    Email failures are logged but never propagated — alerts are still persisted.

    Privacy: the email contains ONLY metadata (§5.1). Never journal text.
    """
    global _consecutive_failures

    settings = get_settings()

    # Early return: SMTP not configured
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning(
            "SMTP not configured. Skipping critical alert email.",
            extra={"alert_id": alert_id},
        )
        return False

    # Early return: no destination email
    if not settings.bienestar_email:
        logger.warning(
            "BIENESTAR_EMAIL not configured. Skipping email.",
            extra={"alert_id": alert_id},
        )
        return False

    # Circuit breaker: too many consecutive failures
    if _consecutive_failures >= _MAX_CONSECUTIVE_FAILURES:
        logger.error(
            "Email circuit breaker OPEN (%d consecutive failures). "
            "Skipping email to avoid SMTP saturation.",
            _consecutive_failures,
            extra={"alert_id": alert_id},
        )
        return False

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Build the email message
    message = MIMEMultipart("alternative")
    message["From"] = settings.smtp_user
    message["To"] = settings.bienestar_email
    message["Subject"] = (
        f"⚠️ [MindCheck] Alerta {risk_level.capitalize()} — "
        "Atención Inmediata Requerida"
    )

    html_body = _build_critical_alert_html(
        risk_level=risk_level,
        sede=sede,
        carrera=carrera,
        timestamp=timestamp,
        alert_id=alert_id,
    )
    message.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            use_tls=False,
            start_tls=True,
            timeout=15,
        )

        # Reset circuit breaker on success
        _consecutive_failures = 0

        logger.info(
            "Critical alert email sent successfully.",
            extra={
                "alert_id": alert_id,
                "recipient": settings.bienestar_email,
            },
        )
        return True

    except Exception as exc:
        _consecutive_failures += 1
        logger.error(
            "Failed to send critical alert email (attempt %d/%d): %s",
            _consecutive_failures,
            _MAX_CONSECUTIVE_FAILURES,
            type(exc).__name__,
            extra={"alert_id": alert_id},
            exc_info=True,
        )
        return False


def reset_email_circuit_breaker() -> None:
    """
    Manually reset the circuit breaker.
    Useful for admin endpoints or after SMTP issues are resolved.
    """
    global _consecutive_failures
    _consecutive_failures = 0
    logger.info("Email circuit breaker reset manually.")
