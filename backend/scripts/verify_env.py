"""
MindCheck — Environment Verification Script.

Validates that all required environment variables are configured correctly
and that external services (Supabase, OpenAI) are reachable.

Usage:
    python -m scripts.verify_env

Exit codes:
    0 — All checks passed
    1 — One or more critical checks failed
"""

import os
import sys
import io

# Fix Windows console encoding for special characters
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Ensure the backend directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()


def print_header(title: str) -> None:
    print(f"\n{'=' * 50}")
    print(f"  {title}")
    print(f"{'=' * 50}")


def check_result(label: str, ok: bool, detail: str = "") -> bool:
    icon = "[OK]" if ok else "[FAIL]"
    msg = f"  {icon} {label}"
    if detail:
        msg += f" -- {detail}"
    print(msg)
    return ok


def main():
    print_header("MindCheck -- Verificacion de Entorno")
    all_ok = True

    # ---------------------------------------------------
    # 1. Check Pydantic Settings loads .env correctly
    # ---------------------------------------------------
    print_header("1. Variables de Entorno (.env)")

    from app.core.config import get_settings
    settings = get_settings()

    # Supabase URL
    ok = bool(settings.supabase_url) and settings.supabase_url.startswith("https://")
    all_ok &= check_result(
        "SUPABASE_URL",
        ok,
        f"{settings.supabase_url[:40]}..." if ok else "VACIO o invalido. Debe comenzar con https://",
    )

    # Supabase service role key
    ok = bool(settings.supabase_service_role_key) and len(settings.supabase_service_role_key) > 20
    all_ok &= check_result(
        "SUPABASE_SERVICE_ROLE_KEY",
        ok,
        f"Configurada ({len(settings.supabase_service_role_key)} chars)" if ok else "VACIA o demasiado corta",
    )

    # OpenAI API key
    ok = bool(settings.openai_api_key) and settings.openai_api_key.startswith("sk-")
    all_ok &= check_result(
        "OPENAI_API_KEY",
        ok,
        f"Configurada (sk-...{settings.openai_api_key[-4:]})" if ok else "VACIA o no empieza con sk-",
    )

    # Encryption key
    ok = bool(settings.encryption_key) and settings.encryption_key != "your-32-byte-hex-key"
    all_ok &= check_result(
        "ENCRYPTION_KEY",
        ok,
        "Configurada" if ok else "VACIA o tiene valor por defecto",
    )

    # App secret key
    ok = settings.app_secret_key != "change-this-in-production" and len(settings.app_secret_key) >= 16
    all_ok &= check_result(
        "APP_SECRET_KEY",
        ok,
        "Configurada" if ok else "Tiene valor por defecto o es muy corta",
    )

    # CORS origins
    check_result(
        "CORS_ORIGINS",
        True,
        settings.cors_origins,
    )

    # ---------------------------------------------------
    # 2. Test Supabase connectivity
    # ---------------------------------------------------
    print_header("2. Conexion a Supabase")

    try:
        from app.repositories.supabase_client import get_supabase_client
        client = get_supabase_client()
        # Try to read from students table (our seed data)
        result = client.table("students").select("id, email").limit(1).execute()
        row_count = len(result.data) if result.data else 0
        all_ok &= check_result(
            "Supabase conectado",
            True,
            f"{row_count} registro(s) en tabla 'students'",
        )

        # Check if demo student exists
        demo = client.table("students").select("id, first_name, last_name").eq(
            "id", "00000000-0000-0000-0000-000000000001"
        ).maybe_single().execute()
        if demo.data:
            check_result(
                "Estudiante demo",
                True,
                f"{demo.data['first_name']} {demo.data['last_name']}",
            )
        else:
            all_ok &= check_result(
                "Estudiante demo",
                False,
                "No encontrado. Ejecuta la migracion SQL primero.",
            )

        # Check journal_entries table exists
        try:
            result = client.table("journal_entries").select("id").limit(1).execute()
            check_result("Tabla journal_entries", True, "Existe")
        except Exception:
            all_ok &= check_result(
                "Tabla journal_entries", False, "No existe. Ejecuta la migracion SQL."
            )

        # Check sentiment_analysis table exists
        try:
            result = client.table("sentiment_analysis").select("id").limit(1).execute()
            check_result("Tabla sentiment_analysis", True, "Existe")
        except Exception:
            all_ok &= check_result(
                "Tabla sentiment_analysis", False, "No existe. Ejecuta la migracion SQL."
            )

    except RuntimeError as e:
        all_ok &= check_result("Supabase", False, str(e))
    except Exception as e:
        all_ok &= check_result("Supabase", False, f"Error: {type(e).__name__}: {e}")

    # ---------------------------------------------------
    # 3. Test encryption round-trip
    # ---------------------------------------------------
    print_header("3. Cifrado AES-256-GCM")

    try:
        from app.services.encryption_service import encrypt_content, decrypt_content

        test_text = "Hoy me siento bien en la universidad."
        encrypted = encrypt_content(test_text)
        decrypted = decrypt_content(encrypted)

        ok = decrypted == test_text
        all_ok &= check_result(
            "Cifrado/descifrado",
            ok,
            f"Round-trip exitoso ({len(encrypted)} chars cifrados)" if ok else "El texto descifrado no coincide",
        )
    except Exception as e:
        all_ok &= check_result("Cifrado", False, f"Error: {type(e).__name__}: {e}")

    # ---------------------------------------------------
    # 4. Test OpenAI connectivity (quick check, no full analysis)
    # ---------------------------------------------------
    print_header("4. Conexion a OpenAI")

    try:
        import asyncio
        from openai import AsyncOpenAI

        async def test_openai():
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "Responde solo: OK"}],
                max_tokens=10,
            )
            return response.choices[0].message.content.strip()

        result = asyncio.run(test_openai())
        all_ok &= check_result(
            "OpenAI GPT-4o mini",
            True,
            f"Respuesta: '{result}'",
        )
    except Exception as e:
        all_ok &= check_result("OpenAI", False, f"Error: {type(e).__name__}: {e}")

    # ---------------------------------------------------
    # 5. Summary
    # ---------------------------------------------------
    print_header("RESULTADO")
    if all_ok:
        print("  [SUCCESS] Todas las verificaciones pasaron!")
        print("  El entorno esta listo para la integracion real.")
        print(f"\n  Inicia el backend con:")
        print(f"    cd backend")
        print(f"    uvicorn app.main:app --reload --port 8000")
    else:
        print("  [WARNING] Algunas verificaciones fallaron.")
        print("  Revisa los errores arriba y corrige antes de continuar.")

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
