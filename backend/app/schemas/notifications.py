"""
MindCheck — Pydantic Schemas for Push Notifications.

Enforces typing and validation for web push subscriptions and payloads.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class PushKeysSchema(BaseModel):
    """Browser cryptographic keys for Web Push encryption."""
    p256dh: str = Field(..., description="The student browser's public key (Base64 URL encoded).")
    auth: str = Field(..., description="The student browser's auth secret key (Base64 URL encoded).")


class PushSubscriptionCreate(BaseModel):
    """Schema for registering or updating a web push subscription (RF-09)."""
    endpoint: str = Field(..., description="The unique push subscription endpoint URL from the browser push service.")
    keys: PushKeysSchema = Field(..., description="The browser keys for payload encryption.")


class PushSubscriptionResponse(BaseModel):
    """Schema for returning registered push subscription metadata."""
    id: UUID
    student_id: UUID
    endpoint: str
    p256dh: str
    auth: str
    created_at: datetime
    updated_at: datetime
