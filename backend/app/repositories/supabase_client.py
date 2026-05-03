"""
MindCheck — Supabase Client Wrapper.

Single point of access to PostgreSQL via Supabase.
Centralizes connection configuration and RLS context.

Per architecture rules:
- Only repositories use this client.
- No direct Supabase access from services or routers.

The backend uses the SERVICE_ROLE key, which bypasses RLS.
This is intentional: the backend enforces ownership at the
service layer (student_id checks) before delegating to repos.
"""

import logging
from functools import lru_cache

from supabase import create_client, Client

from app.core.config import get_settings

logger = logging.getLogger("mindcheck.db")


@lru_cache()
def get_supabase_client() -> Client:
    """
    Creates and caches a Supabase client using service role key.

    The service role key bypasses RLS — the backend enforces
    data ownership at the service layer instead.

    Raises RuntimeError if Supabase credentials are missing.
    """
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorios. "
            "Configura las variables de entorno en .env"
        )

    client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
    logger.info("Supabase client initialized (service role).")
    return client
