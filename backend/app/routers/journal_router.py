"""
MindCheck — Journal API Router.

Orchestrates HTTP requests for journal entry operations.
Validates schemas, delegates to services, and returns responses.

All endpoints that call the DB or OpenAI API are async def.
Never def for I/O operations (§4.4).

Fallback flow (SRS §6.3):
- POST /analyze → returns ai_available=false if AI fails
- POST /manual-emotion → saves manually selected emotion for that entry

Authentication:
- All endpoints require a valid Supabase JWT in the Authorization header.
- student_id is extracted dynamically from the JWT 'sub' claim.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from app.core.security import get_authenticated_student_id
from app.schemas.journal import JournalEntryCreate
from app.services.journal_service import JournalService
from app.services.alert_service import AlertDetectionService

logger = logging.getLogger("mindcheck.routers.journal")

router = APIRouter(prefix="/api/v1/journal", tags=["Journal"])


# --- Dependency Injection ---

def get_journal_service() -> JournalService:
    """Dependency injection for JournalService."""
    return JournalService()


def get_alert_service() -> AlertDetectionService:
    """Dependency injection for AlertDetectionService."""
    return AlertDetectionService()


# --- Schemas for this router ---

class ManualEmotionRequest(BaseModel):
    """Schema for manual emotion fallback (SRS §6.3)."""
    entry_id: str = Field(
        ..., description="UUID of the journal entry to annotate."
    )
    dominant_emotion: str = Field(
        ..., description="Manually selected emotion: ansiedad, tristeza, alegría, estrés, frustración, calma."
    )
    sentiment_score: float = Field(
        default=0.0, ge=-1.0, le=1.0,
        description="Optional manual sentiment score."
    )
    risk_level: str = Field(
        default="bajo",
        description="Optional risk level: bajo, moderado, alto, critico."
    )


# --- Endpoints ---

@router.post("/analyze", status_code=201)
async def analyze_journal_entry(
    body: JournalEntryCreate,
    student_id: UUID = Depends(get_authenticated_student_id),
    journal_service: JournalService = Depends(get_journal_service),
    alert_service: AlertDetectionService = Depends(get_alert_service),
):
    """
    Create a new journal entry and analyze with AI (RF-03 + RF-04).

    Flow: Authenticate → Validate → Encrypt → Save → Analyze → Check alerts → Respond.

    The student_id is extracted from the JWT 'sub' claim automatically.

    If AI analysis fails, the response includes:
      - ai_available: false
      - ai_error_message: <user-friendly error description>
    The frontend should show the manual emotion picker in this case.
    """
    result = await journal_service.create_and_analyze_entry(
        student_id=student_id,
        content=body.content,
    )

    # Check for risk alerts after analysis (only if AI succeeded)
    alert = None
    if result.get("analysis"):
        from uuid import UUID as _UUID
        entry_id = _UUID(result["entry"]["id"])
        alert = await alert_service.detect_risk_pattern_in_entries(
            student_id=student_id,
            entry_id=entry_id,
            latest_analysis=result["analysis"],
        )

    return {
        "entry": result["entry"],
        "analysis": result["analysis"],
        "ai_available": result["ai_available"],
        "ai_error_message": result.get("ai_error_message"),
        "alert": alert,
    }


@router.post("/manual-emotion", status_code=200)
async def save_manual_emotion(
    body: ManualEmotionRequest,
    student_id: UUID = Depends(get_authenticated_student_id),
    journal_service: JournalService = Depends(get_journal_service),
    alert_service: AlertDetectionService = Depends(get_alert_service),
):
    """
    Save a manually selected emotion for an entry (SRS §6.3 fallback).

    Called when AI analysis fails and the student picks an emotion
    from the predefined list in the UI.
    """
    try:
        result = await journal_service.save_manual_emotion(
            entry_id=UUID(body.entry_id),
            student_id=student_id,
            manual_data=body.model_dump(),
        )
        
        # Evaluate alerts for the manual fallback entry
        alert = await alert_service.detect_risk_pattern_in_entries(
            student_id=student_id,
            entry_id=UUID(body.entry_id),
            latest_analysis=result["analysis"],
        )
        
        return {
            "entry": result["entry"],
            "analysis": result["analysis"],
            "alert": alert,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/entries")
async def get_journal_entries(
    student_id: UUID = Depends(get_authenticated_student_id),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    journal_service: JournalService = Depends(get_journal_service),
):
    """
    List journal entries for the authenticated student (RF-05).
    Paginated. Returns metadata only, not encrypted content.
    """
    entries = await journal_service.get_student_entries(
        student_id=student_id,
        limit=limit,
        offset=offset,
    )
    return {"entries": entries, "total": len(entries)}


@router.get("/entries/{entry_id}")
async def get_journal_entry_detail(
    entry_id: UUID,
    student_id: UUID = Depends(get_authenticated_student_id),
    journal_service: JournalService = Depends(get_journal_service),
):
    """
    Get a single journal entry with its full analysis.
    Enforces ownership: students can only access their own entries.
    Content is decrypted server-side for the detail view only.
    """
    result = await journal_service.get_entry_detail(entry_id, student_id)

    if not result:
        raise HTTPException(status_code=404, detail="Entrada no encontrada.")

    return result


@router.delete("/entries/{entry_id}", status_code=204)
async def delete_journal_entry(
    entry_id: UUID,
    student_id: UUID = Depends(get_authenticated_student_id),
    journal_service: JournalService = Depends(get_journal_service),
):
    """
    Permanently delete a journal entry (RF-05, RNF-13).
    Only the owning student can delete. Cascades to analysis.
    """
    deleted = await journal_service.delete_entry(entry_id, student_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Entrada no encontrada.")
