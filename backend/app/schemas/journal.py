"""
MindCheck — Pydantic Schemas for Journal Entries and Sentiment Analysis.

These schemas enforce strict typing and validation for all data
flowing through the API. The SentimentAnalysisResponse validates
the JSON output from OpenAI GPT-4o mini.
"""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# --- Enums ---

class RiskLevel(str, Enum):
    """Risk levels for emotional assessment."""
    BAJO = "bajo"
    MODERADO = "moderado"
    ALTO = "alto"
    CRITICO = "critico"


class DominantEmotion(str, Enum):
    """Known dominant emotions detected by the AI."""
    ANSIEDAD = "ansiedad"
    TRISTEZA = "tristeza"
    ALEGRIA = "alegría"
    ESTRES = "estrés"
    FRUSTRACION = "frustración"
    CALMA = "calma"
    OTRO = "otro"


# --- Journal Entry Schemas ---

class JournalEntryCreate(BaseModel):
    """Schema for creating a new journal entry (RF-03)."""
    content: str = Field(
        ...,
        min_length=20,
        max_length=2000,
        description="Emotional journal entry text in Spanish (20-2000 chars).",
    )

    @field_validator("content")
    @classmethod
    def validate_content_not_empty(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 20:
            raise ValueError("El contenido debe tener al menos 20 caracteres significativos.")
        return stripped


class JournalEntryResponse(BaseModel):
    """Schema for journal entry API response."""
    id: UUID
    student_id: UUID
    content_preview: str = Field(
        description="First 100 chars of the entry. Full text never exposed in lists."
    )
    sentiment_score: float | None = None
    dominant_emotion: str | None = None
    risk_level: str | None = None
    keywords: list[str] = []
    created_at: datetime


class JournalEntryDetail(JournalEntryResponse):
    """Detailed entry with full analysis, for single-entry view."""
    analysis: "SentimentAnalysisResponse | None" = None
    recommendations: list[str] = []


# --- Sentiment Analysis Schemas ---

class SentimentAnalysisResponse(BaseModel):
    """
    Validated schema for GPT-4o mini analysis output (RF-04).
    
    This model validates the structured JSON response from OpenAI.
    If the response doesn't match this schema, it is rejected and retried.
    """
    sentiment_score: float = Field(
        ...,
        ge=-1.0,
        le=1.0,
        description="Sentiment score from -1.0 (very negative) to 1.0 (very positive).",
    )
    dominant_emotion: str = Field(
        ...,
        description="Primary emotion detected in the text.",
    )
    secondary_emotions: list[str] = Field(
        default_factory=list,
        description="Secondary emotions detected.",
    )
    risk_level: str = Field(
        ...,
        description="Risk level: bajo, moderado, alto, critico.",
    )
    risk_justification: str = Field(
        ...,
        description="Brief justification for the assigned risk level.",
    )
    keywords: list[str] = Field(
        default_factory=list,
        description="Emotional keywords extracted from the text.",
    )
    recommendations: list[str] = Field(
        default_factory=list,
        description="Personalized recommendations based on detected state.",
    )
    crisis_indicators: bool = Field(
        default=False,
        description="Whether crisis indicators were detected.",
    )


# --- Alert Schemas ---

class AlertResponse(BaseModel):
    """Schema for alert notifications (RF-08)."""
    id: UUID
    student_id: UUID
    entry_id: UUID | None = None
    alert_type: str
    risk_level: str
    message: str
    triggered_at: datetime
    acknowledged_at: datetime | None = None


# --- Resource Schemas ---

class ResourceResponse(BaseModel):
    """Schema for self-help resources (RF-10)."""
    id: UUID
    title: str
    description: str
    resource_type: str
    duration: str | None = None
    emotion_tags: list[str] = []
    risk_level_tags: list[str] = []
    url: str | None = None
    icon: str | None = None
    active: bool = True


# --- Health Check ---

class HealthResponse(BaseModel):
    """API health check response."""
    status: str = "ok"
    version: str = "0.1.0"
    environment: str
