"""
MindCheck Backend — Core Configuration.

Centralizes all environment variable management using Pydantic Settings.
All sensitive values (API keys, DB credentials) are loaded exclusively
from environment variables. Never hardcoded.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Application ---
    app_env: str = "development"
    app_secret_key: str = "change-this-in-production"
    cors_origins: str = "http://localhost:5173"

    # --- Supabase ---
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""

    # --- OpenAI ---
    openai_api_key: str = ""

    # --- Encryption ---
    encryption_key: str = ""

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
