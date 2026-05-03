"""
MindCheck — Journal Entries Repository.

Unique point of access to the journal_entries and sentiment_analysis
tables in Supabase/PostgreSQL. No other layer queries the database directly.

Per immutability rules:
- Journal entries are IMMUTABLE once saved (no UPDATE on content).
- Sentiment analysis objects are write-only.
- Students can only DELETE their own entries (cascade).

All methods are sync (Supabase Python SDK is synchronous).
The service layer calls them from async context via run_in_executor
when needed, or directly since supabase-py handles I/O internally.
"""

import logging
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.repositories.supabase_client import get_supabase_client

logger = logging.getLogger("mindcheck.repo.journal")


class JournalRepository:
    """Repository for journal_entries and sentiment_analysis tables."""

    def __init__(self):
        self._client = get_supabase_client()

    def create_entry(
        self,
        student_id: UUID,
        content_encrypted: str,
    ) -> dict:
        """
        Insert a new journal entry with encrypted content.
        Returns the created entry record.
        """
        result = (
            self._client.table("journal_entries")
            .insert({
                "student_id": str(student_id),
                "content_encrypted": content_encrypted,
            })
            .execute()
        )

        if not result.data:
            logger.error("Failed to create journal entry.")
            raise RuntimeError("No se pudo guardar la entrada de bitácora.")

        logger.info(
            "Journal entry created.",
            extra={"entry_id": result.data[0]["id"]},
        )
        return result.data[0]

    def update_entry_analysis_summary(
        self,
        entry_id: UUID,
        sentiment_score: float,
        dominant_emotion: str,
        risk_level: str,
        keywords: list[str],
        analysis_id: str | None,
    ) -> None:
        """
        Update the denormalized analysis summary fields on an entry.

        This is the ONLY allowed update on journal_entries — it writes
        the AI analysis summary. The content itself is never modified.
        """
        self._client.table("journal_entries").update({
            "sentiment_score": sentiment_score,
            "dominant_emotion": dominant_emotion,
            "risk_level": risk_level,
            "keywords": keywords,
            "analysis_id": analysis_id,
        }).eq("id", str(entry_id)).execute()

    def save_analysis(
        self,
        entry_id: UUID,
        analysis_data: dict,
    ) -> dict:
        """
        Save sentiment analysis result for an entry.
        Write-only — never updated after creation.
        """
        # Prepare the row for insertion
        row = {
            "entry_id": str(entry_id),
            "sentiment_score": analysis_data["sentiment_score"],
            "dominant_emotion": analysis_data["dominant_emotion"],
            "secondary_emotions": analysis_data.get("secondary_emotions", []),
            "risk_level": analysis_data["risk_level"],
            "risk_justification": analysis_data.get("risk_justification", ""),
            "keywords": analysis_data.get("keywords", []),
            "recommendations": analysis_data.get("recommendations", []),
            "crisis_indicators": analysis_data.get("crisis_indicators", False),
            "raw_response": analysis_data,  # Full response as JSONB for audit
        }

        result = (
            self._client.table("sentiment_analysis")
            .insert(row)
            .execute()
        )

        if not result.data:
            logger.error("Failed to save analysis.", extra={"entry_id": str(entry_id)})
            raise RuntimeError("No se pudo guardar el análisis de sentimiento.")

        analysis_record = result.data[0]

        # Update the journal entry with denormalized summary
        self.update_entry_analysis_summary(
            entry_id=entry_id,
            sentiment_score=analysis_data["sentiment_score"],
            dominant_emotion=analysis_data["dominant_emotion"],
            risk_level=analysis_data["risk_level"],
            keywords=analysis_data.get("keywords", []),
            analysis_id=analysis_record["id"],
        )

        logger.info(
            "Analysis saved and entry updated.",
            extra={
                "entry_id": str(entry_id),
                "risk_level": analysis_data["risk_level"],
            },
        )
        return analysis_record

    def get_entries_by_student(
        self,
        student_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        """
        Retrieve journal entries for a student, ordered by creation date.
        Returns metadata + summary — never the encrypted content in list views.
        """
        result = (
            self._client.table("journal_entries")
            .select(
                "id, student_id, sentiment_score, dominant_emotion, "
                "risk_level, keywords, created_at"
            )
            .eq("student_id", str(student_id))
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return result.data or []

    def get_entry_by_id(self, entry_id: UUID) -> dict | None:
        """Retrieve a single entry by ID (includes encrypted content)."""
        try:
            result = (
                self._client.table("journal_entries")
                .select("*")
                .eq("id", str(entry_id))
                .maybe_single()
                .execute()
            )
            return result.data
        except Exception as exc:
            logger.warning("Entry not found: %s", entry_id, exc_info=exc)
            return None

    def get_analysis_by_entry_id(self, entry_id: UUID) -> dict | None:
        """Retrieve sentiment analysis for a specific entry."""
        try:
            result = (
                self._client.table("sentiment_analysis")
                .select("*")
                .eq("entry_id", str(entry_id))
                .maybe_single()
                .execute()
            )
            return result.data
        except Exception as exc:
            logger.warning("Analysis not found for entry: %s", entry_id, exc_info=exc)
            return None

    def delete_entry(self, entry_id: UUID, student_id: UUID) -> bool:
        """
        Permanently delete an entry and its analysis (cascade).
        Only the owning student can delete their own entries (RF-05, RNF-13).
        """
        result = (
            self._client.table("journal_entries")
            .delete()
            .eq("id", str(entry_id))
            .eq("student_id", str(student_id))
            .execute()
        )
        deleted = len(result.data) > 0 if result.data else False
        if deleted:
            logger.info("Entry deleted.", extra={"entry_id": str(entry_id)})
        return deleted

    def count_negative_entries_in_period(
        self,
        student_id: UUID,
        days: int = 7,
    ) -> int:
        """
        Count entries with negative sentiment in the last N days.
        Used by the alert detection service (RF-08).
        """
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        result = (
            self._client.table("journal_entries")
            .select("id", count="exact")
            .eq("student_id", str(student_id))
            .lt("sentiment_score", 0)
            .gte("created_at", cutoff)
            .execute()
        )
        return result.count or 0
