"""
MindCheck — Students API Router.

Orchestrates HTTP requests for student profile operations.
Enforces authentications and delegates to StudentService.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_authenticated_student_id
from app.services.student_service import StudentService

logger = logging.getLogger("mindcheck.routers.students")

router = APIRouter(prefix="/api/v1/students", tags=["Students"])


# --- Dependency Injection ---

def get_student_service() -> StudentService:
    """Dependency injection for StudentService."""
    return StudentService()


# --- Endpoints ---

@router.delete("/me", status_code=204)
async def delete_student_account(
    student_id: UUID = Depends(get_authenticated_student_id),
    student_service: StudentService = Depends(get_student_service),
):
    """
    Permanently delete the authenticated student's profile and account.
    
    Fulfills the Right to be Forgotten (RNF-13 / Ley 19.628).
    Deletes all personal emotional records (bitacoras, analysis, alerts) in cascade.
    """
    success = await student_service.delete_student_account(student_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se pudo eliminar la cuenta. El usuario no fue encontrado.",
        )
    return None
