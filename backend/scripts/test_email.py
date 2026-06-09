"""
Quick test script - sends a test critical alert email.
Run: .venv/Scripts/python.exe scripts/test_email.py
"""

import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.email_service import send_critical_alert_email


async def main():
    print("=" * 50)
    print("MindCheck - Test de envio de correo SMTP")
    print("=" * 50)

    print("\nEnviando correo de prueba de alerta critica...")
    print("Destinatario: micorreopruebascapstone@gmail.com\n")

    success = await send_critical_alert_email(
        risk_level="critico",
        sede="Santiago",
        carrera="Ingenieria en Informatica",
        alert_id="test-00000000-0000-0000-0000-000000000001",
    )

    if success:
        print("[OK] Correo enviado exitosamente!")
        print("     Revisa la bandeja de micorreopruebascapstone@gmail.com")
    else:
        print("[ERROR] El correo no se pudo enviar.")
        print("        Revisa los logs arriba para mas detalles.")

    print()


if __name__ == "__main__":
    asyncio.run(main())
