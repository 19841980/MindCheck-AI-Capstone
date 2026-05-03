"""
MindCheck — Journal Service.

Pure business logic for journal entries. Does NOT know about
HTTP, UI, or database internals. Delegates:
- Data persistence → JournalRepository
- AI analysis → OpenAIClient
- Encryption → EncryptionService

Follows Single Responsibility: analyze_emotional_sentiment() does
not save to database. Saving is a separate operation.

Encryption (AES-256-GCM) is CPU-bound → executed via
run_in_executor to avoid blocking the async event loop (§4.4).
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from uuid import UUID

from app.ai.openai_client import get_openai_client
from app.repositories.journal_repo import JournalRepository
from app.services.encryption_service import encrypt_content, decrypt_content
from app.schemas.journal import SentimentAnalysisResponse

logger = logging.getLogger("mindcheck.services.journal")

# Thread pool for CPU-bound encryption operations
_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="encryption")


class JournalService:
    """Business logic for journal entry operations."""

    def __init__(self):
        self._repo = JournalRepository()
        self._ai = get_openai_client()

    async def create_and_analyze_entry(
        self, student_id: UUID, content: str
    ) -> dict:
        """
        Full flow: encrypt → save entry → analyze with AI → save analysis.

        If AI analysis fails, the entry is still saved (degraded mode).
        The response includes ai_available=False so the frontend
        can show the manual emotion picker (SRS §6.3 fallback).
        """
        loop = asyncio.get_event_loop()

        # Step 1: Encrypt content (CPU-bound → run_in_executor)
        content_encrypted = await loop.run_in_executor(
            _executor, encrypt_content, content
        )

        # Step 2: Save the entry (immutable once saved)
        entry = await loop.run_in_executor(
            _executor, self._repo.create_entry, student_id, content_encrypted
        )
        entry_id = UUID(entry["id"])

        logger.info(
            "Entry persisted (encrypted).",
            extra={"entry_id": str(entry_id)},
        )

        # Step 3: Analyze with AI (real GPT-4o mini call)
        analysis = None
        ai_available = True
        ai_error_message = None

        try:
            analysis = await self._ai.analyze_emotional_sentiment(content)

            # Step 4: Save the analysis result to DB
            await loop.run_in_executor(
                _executor,
                self._repo.save_analysis,
                entry_id,
                analysis.model_dump(),
            )

            logger.info(
                "Entry analyzed successfully.",
                extra={
                    "entry_id": str(entry_id),
                    "risk_level": analysis.risk_level,
                },
            )

        except ValueError as e:
            # AI analysis failed — entry is saved without analysis (degraded mode)
            ai_available = False
            ai_error_message = str(e)
            logger.warning(
                "AI analysis failed. Entry saved without analysis (degraded mode).",
                extra={"entry_id": str(entry_id), "error": str(e)},
            )

        except Exception as e:
            # Unexpected error — still don't lose the entry
            ai_available = False
            ai_error_message = "El servicio de análisis no está disponible temporalmente."
            logger.error(
                "Unexpected error during AI analysis.",
                extra={"entry_id": str(entry_id)},
                exc_info=True,
            )

        return {
            "entry": entry,
            "analysis": analysis.model_dump() if analysis else None,
            "ai_available": ai_available,
            "ai_error_message": ai_error_message,
        }

    async def save_manual_emotion(
        self, entry_id: UUID, student_id: UUID, manual_data: dict
    ) -> dict:
        """
        Save a manually selected emotion when AI analysis fails.
        
        This is the fallback defined in SRS §6.3: the student
        picks their dominant emotion from a predefined list.
        """
        loop = asyncio.get_event_loop()

        # Verify ownership
        entry = await loop.run_in_executor(
            _executor, self._repo.get_entry_by_id, entry_id
        )
        if not entry:
            raise ValueError("Entrada no encontrada.")
        if entry.get("student_id") != str(student_id):
            raise ValueError("No tienes permiso para modificar esta entrada.")
        if entry.get("analysis_id") is not None:
            raise ValueError("Esta entrada ya tiene un análisis.")

        # Build a minimal analysis from manual selection
        fallback_analysis = {
            "sentiment_score": manual_data.get("sentiment_score", 0.0),
            "dominant_emotion": manual_data["dominant_emotion"],
            "secondary_emotions": [],
            "risk_level": manual_data.get("risk_level", "bajo"),
            "risk_justification": "Emoción seleccionada manualmente por el estudiante.",
            "keywords": [],
            "recommendations": [],
            "crisis_indicators": False,
        }

        analysis_record = await loop.run_in_executor(
            _executor,
            self._repo.save_analysis,
            entry_id,
            fallback_analysis,
        )

        logger.info(
            "Manual emotion saved for entry.",
            extra={"entry_id": str(entry_id), "emotion": manual_data["dominant_emotion"]},
        )

        return {
            "entry": entry,
            "analysis": fallback_analysis,
        }

    async def get_student_entries(
        self, student_id: UUID, limit: int = 50, offset: int = 0
    ) -> list[dict]:
        """Retrieve paginated entries for a student (metadata only)."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _executor,
            self._repo.get_entries_by_student,
            student_id,
            limit,
            offset,
        )

    async def get_entry_detail(
        self, entry_id: UUID, student_id: UUID
    ) -> dict | None:
        """
        Retrieve entry with full analysis. Enforces ownership.
        Decrypts content for the single-entry detail view.
        """
        loop = asyncio.get_event_loop()

        entry = await loop.run_in_executor(
            _executor, self._repo.get_entry_by_id, entry_id
        )

        if not entry:
            return None
        if entry.get("student_id") != str(student_id):
            return None  # Forbidden — not the owner

        # Decrypt content for the detail view
        try:
            entry["content_decrypted"] = await loop.run_in_executor(
                _executor, decrypt_content, entry.get("content_encrypted", "")
            )
        except Exception as e:
            logger.error(
                "Failed to decrypt entry content.",
                extra={"entry_id": str(entry_id)},
                exc_info=True,
            )
            entry["content_decrypted"] = "[Error: no se pudo descifrar el contenido]"

        # Remove encrypted content from response (never exposed to frontend)
        entry.pop("content_encrypted", None)

        analysis = await loop.run_in_executor(
            _executor, self._repo.get_analysis_by_entry_id, entry_id
        )

        return {
            "entry": entry,
            "analysis": analysis,
        }

    async def delete_entry(self, entry_id: UUID, student_id: UUID) -> bool:
        """Delete an entry. Only the owning student can delete."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _executor, self._repo.delete_entry, entry_id, student_id
        )
