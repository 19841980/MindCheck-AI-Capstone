"""
MindCheck — Test Sentiment Analysis and Risk Levels.

Verifies the AI analysis flow for a low-risk journal entry and a critical-risk journal entry.
Validates Pydantic schemas, database persistence, and Alert service routing.

To run (Mock Mode - Default):
  .venv/Scripts/python.exe scripts/test_sentiment_risk.py

To run (Real Mode - calls live OpenAI):
  $env:USE_REAL_AI="true"; .venv/Scripts/python.exe scripts/test_sentiment_risk.py
"""

import asyncio
import os
import sys
import json
from uuid import UUID, uuid4
from unittest.mock import AsyncMock, patch

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.repositories.supabase_client import get_supabase_client
from app.services.journal_service import JournalService
from app.services.alert_service import AlertDetectionService
from app.services.student_service import StudentService
from app.schemas.journal import SentimentAnalysisResponse
from app.ai.openai_client import OpenAIClient

# --- Chilean Spanish test cases ---

LOW_RISK_ENTRY = (
    "Hoy fue un día bastante piola. Fui a clases en la sede San Joaquín, estudié harto para "
    "el certamen de base de datos y por suerte entendí toda la materia. En la tarde nos "
    "juntamos con unos compañeros a tomar un café y conversar de la vida. Me siento un poco "
    "cansado por la rutina de la semana, pero tranquilo y optimista con los estudios."
)

CRITICAL_RISK_ENTRY = (
    "No puedo más, me siento sola, no quiero seguir así, no tengo energía ni ganas de nada"
)

# --- Mocked AI Responses ---

MOCK_LOW_RISK_RESPONSE = SentimentAnalysisResponse(
    sentiment_score=0.45,
    dominant_emotion="calma",
    secondary_emotions=["alegría"],
    risk_level="bajo",
    risk_justification="El estudiante describe un día tranquilo, de estudio exitoso y socialización.",
    keywords=["piola", "estudié", "tranquilo", "optimista"],
    recommendations=["Sigue manteniendo un equilibrio saludable entre el estudio y el descanso."],
    crisis_indicators=False
)

MOCK_CRITICAL_RISK_RESPONSE = SentimentAnalysisResponse(
    sentiment_score=-0.85,
    dominant_emotion="tristeza",
    secondary_emotions=["frustración"],
    risk_level="critico",
    risk_justification="El estudiante expresa ideación suicida ('terminar con todo') y planes de autolesión.",
    keywords=["desesperanza", "autolesionarme", "terminar con todo", "estorbo"],
    recommendations=["Por favor, acércate al equipo de Bienestar de tu sede o comunícate al número de emergencia."],
    crisis_indicators=True
)


async def test_low_risk_flow(student_id: UUID, mock_ai: bool):
    print("\n" + "=" * 60)
    print("TEST 1: Flujo de Riesgo Bajo")
    print("=" * 60)
    print(f"Texto a analizar:\n{LOW_RISK_ENTRY}\n")

    journal_service = JournalService()
    alert_service = AlertDetectionService()

    # Determine if we mock the OpenAI call
    if mock_ai:
        print("[INFO] Ejecutando en Modo MOCK (Simulando respuesta de OpenAI)")
        analyze_mock = AsyncMock(return_value=MOCK_LOW_RISK_RESPONSE)
        patcher = patch.object(OpenAIClient, "analyze_emotional_sentiment", new=analyze_mock)
        patcher.start()
    else:
        print("[INFO] Ejecutando en Modo REAL (Llamando a OpenAI API en vivo)")
        patcher = None

    try:
        # Step 1: Create and analyze entry
        result = await journal_service.create_and_analyze_entry(student_id, LOW_RISK_ENTRY)
        
        # Verify result contains the correctly formatted analysis
        analysis_data = result["analysis"]
        assert analysis_data is not None, "El analisis no deberia ser None"
        assert result["ai_available"] is True, "AI deberia estar disponible"
        
        print("Analisis persistido en la base de datos:")
        print(json.dumps(analysis_data, indent=2, ensure_ascii=False))

        # Check fields
        assert analysis_data["risk_level"] == "bajo", f"Esperado riesgo 'bajo', obtenido '{analysis_data['risk_level']}'"
        assert analysis_data["crisis_indicators"] is False, "Esperado crisis_indicators como False"
        assert analysis_data["sentiment_score"] >= 0.0, f"Esperado sentiment_score >= 0.0, obtenido {analysis_data['sentiment_score']}"

        # Step 2: Evaluate alert triggering
        entry_id = UUID(result["entry"]["id"])
        alert_record = await alert_service.detect_risk_pattern_in_entries(
            student_id=student_id,
            entry_id=entry_id,
            latest_analysis=analysis_data
        )

        # Verify NO alert is triggered for low risk
        assert alert_record is None, "No se deberia haber generado una alerta para una entrada de riesgo bajo"
        print("[INFO] Verificado: No se genero ninguna alerta (Riesgo Bajo funciona correctamente)")

        print("\n[OK] TEST 1 PASO EXITOSAMENTE!")
        return True, entry_id
    except AssertionError as ae:
        print(f"\n[ERROR] TEST 1 FALLO (Fallo de Asercion): {ae}")
        return False, None
    except Exception as e:
        print(f"\n[ERROR] TEST 1 FALLO (Error inesperado): {e}")
        return False, None
    finally:
        if patcher:
            patcher.stop()


async def test_critical_risk_flow(student_id: UUID, mock_ai: bool):
    print("\n" + "=" * 60)
    print("TEST 2: Flujo de Riesgo Critico")
    print("=" * 60)
    print(f"Texto a analizar:\n{CRITICAL_RISK_ENTRY}\n")

    journal_service = JournalService()
    alert_service = AlertDetectionService()

    # Determine if we mock the OpenAI call
    if mock_ai:
        print("[INFO] Ejecutando en Modo MOCK (Simulando respuesta de OpenAI y SMTP)")
        analyze_mock = AsyncMock(return_value=MOCK_CRITICAL_RISK_RESPONSE)
        ai_patcher = patch.object(OpenAIClient, "analyze_emotional_sentiment", new=analyze_mock)
        ai_patcher.start()
    else:
        print("[INFO] Ejecutando en Modo REAL (Llamando a OpenAI API en vivo)")
        ai_patcher = None

    # Determine if we mock the email/SMTP call
    mock_email = os.environ.get("SEND_REAL_EMAIL", "false").lower() != "true"
    
    if mock_email:
        print("[INFO] Ejecutando en Modo MOCK de correo (Simulando SMTP)")
        email_mock = AsyncMock(return_value=True)
        email_patcher = patch("app.services.alert_service.send_critical_alert_email", new=email_mock)
        email_patcher.start()
    else:
        print("[INFO] Ejecutando en Modo REAL de correo (Enviando email real por SMTP)")
        email_mock = None
        email_patcher = None

    try:
        # Step 1: Create and analyze entry
        result = await journal_service.create_and_analyze_entry(student_id, CRITICAL_RISK_ENTRY)
        
        # Verify analysis exists
        analysis_data = result["analysis"]
        assert analysis_data is not None, "El analisis no deberia ser None"
        assert result["ai_available"] is True, "AI deberia estar disponible"
        
        print("Analisis persistido en la base de datos:")
        print(json.dumps(analysis_data, indent=2, ensure_ascii=False))

        # Check fields
        assert analysis_data["risk_level"] == "critico", f"Esperado riesgo 'critico', obtenido '{analysis_data['risk_level']}'"
        assert analysis_data["crisis_indicators"] is True, "Esperado crisis_indicators como True"
        assert analysis_data["sentiment_score"] < 0.0, f"Esperado sentiment_score negativo, obtenido {analysis_data['sentiment_score']}"

        # Step 2: Evaluate alert triggering
        entry_id = UUID(result["entry"]["id"])
        alert_record = await alert_service.detect_risk_pattern_in_entries(
            student_id=student_id,
            entry_id=entry_id,
            latest_analysis=analysis_data
        )

        # Verify a critical alert WAS triggered and persisted
        assert alert_record is not None, "Se debio haber generado una alerta de riesgo critico"
        assert alert_record["risk_level"] == "critico", f"Esperado nivel de riesgo 'critico' en alerta, obtenido '{alert_record['risk_level']}'"
        assert alert_record["alert_type"] == "critico", f"Esperado tipo de alerta 'critico', obtenido '{alert_record['alert_type']}'"
        
        print("Alerta generada y guardada en Supabase:")
        print(json.dumps(alert_record, indent=2, ensure_ascii=False))

        # Verify email triggering
        if mock_email:
            assert email_mock.called, "El servicio debio haber llamado a la funcion de envio de correo de alerta critica"
            print("[INFO] Verificado: El correo de alerta critica fue gatillado correctamente.")
        else:
            print("[INFO] Correo real enviado exitosamente por SMTP.")

        print("\n[OK] TEST 2 PASO EXITOSAMENTE!")
        return True, entry_id
    except AssertionError as ae:
        print(f"\n[ERROR] TEST 2 FALLO (Fallo de Asercion): {ae}")
        return False, None
    except Exception as e:
        print(f"\n[ERROR] TEST 2 FALLO (Error inesperado): {e}")
        return False, None
    finally:
        if ai_patcher:
            ai_patcher.stop()
        if email_patcher:
            email_patcher.stop()


async def main():
    print("=" * 60)
    print("MindCheck - Test de Analisis Emocional y Niveles de Riesgo")
    print("=" * 60)

    # Determine execution mode
    use_real = os.environ.get("USE_REAL_AI", "false").lower() == "true"
    mock_ai = not use_real

    client = get_supabase_client()
    email = "test.sentiment@duocuc.cl"
    student_id = None
    
    print(f"[INFO] Creando estudiante temporal de prueba: {email}...")
    try:
        # Clean up existing test user if any left over
        res = client.table("students").select("id").eq("email", email).execute()
        if res and res.data:
            old_id = UUID(res.data[0]["id"])
            await StudentService().delete_student_account(old_id)
            print("[INFO] Estudiante residual previo eliminado.")

        user = client.auth.admin.create_user({
            "email": email,
            "password": "PasswordTest123!",
            "email_confirm": True,
            "user_metadata": {
                "first_name": "Test",
                "last_name": "Sentiment",
                "sede": "San Joaquín",
                "carrera": "Ingeniería en Informática"
            }
        })
        student_id = UUID(user.user.id)
        
        # Give consent explicitly to bypass privacy barriers
        client.table("students").update({
            "consent_given": True,
            "consent_given_at": "now()",
            "rut_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        }).eq("id", str(student_id)).execute()
        
        print(f"[INFO] Estudiante creado exitosamente. ID: {student_id}")
    except Exception as exc:
        print(f"[ERROR] No se pudo preparar el estudiante de prueba: {exc}")
        sys.exit(1)

    # Execute tests
    success_1 = False
    success_2 = False
    try:
        success_1, entry_1 = await test_low_risk_flow(student_id, mock_ai)
        success_2, entry_2 = await test_critical_risk_flow(student_id, mock_ai)
    finally:
        # Cleanup
        print("\n" + "=" * 60)
        print("LIMPIEZA DE DATOS:")
        print("=" * 60)
        if student_id:
            print(f"[INFO] Eliminando estudiante temporal ID: {student_id} (esto eliminara en cascada las bitacoras y alertas)...")
            success_del = await StudentService().delete_student_account(student_id)
            print(f"[INFO] Resultado de la eliminacion: {'Exitosa' if success_del else 'Fallida'}")

    # Summary
    print("\n" + "=" * 60)
    print("RESUMEN DE RESULTADOS:")
    print(f"Test 1 (Riesgo Bajo): {'PASO' if success_1 else 'FALLO'}")
    print(f"Test 2 (Riesgo Critico): {'PASO' if success_2 else 'FALLO'}")
    print("=" * 60)

    if success_1 and success_2:
        print("\n[EXITO] Ambas pruebas pasaron de forma correcta.")
        sys.exit(0)
    else:
        print("\n[ERROR] Al menos una prueba ha fallado.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
