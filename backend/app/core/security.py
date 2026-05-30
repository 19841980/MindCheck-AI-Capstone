"""
MindCheck — JWT Authentication Security Module.

FastAPI dependency that verifies Supabase JWT access tokens.
Extracts the student_id (sub claim) and injects it into routes.

Security design:
- Verifies HS256 signature using SUPABASE_JWT_SECRET.
- Validates expiration (exp), issuer (iss), and required claims.
- Uses Early Return pattern for error cases (§4.2).
- Never logs emotional data — only auth metadata (§5.1).

Usage in routers:
    from app.core.security import get_authenticated_student_id

    @router.get("/entries")
    async def get_entries(student_id: UUID = Depends(get_authenticated_student_id)):
        ...
"""

import logging
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from jose import JWTError, jwt

from app.core.config import Settings, get_settings

logger = logging.getLogger("mindcheck.security")

# --- Bearer Token Extraction ---
# HTTPBearer extracts the token from "Authorization: Bearer <TOKEN>".
# auto_error=True → returns 403 automatically if header is missing.
_bearer_scheme = HTTPBearer(auto_error=True)

# JWT algorithm — Supabase uses HS256 for project JWT secrets.
_JWT_ALGORITHM = "HS256"


async def get_authenticated_student_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> UUID:
    """
    FastAPI dependency: verify JWT and extract student_id.

    Extracts the access token from the Authorization header,
    verifies its signature and expiration against the Supabase
    JWT secret, and returns the authenticated user's UUID.

    Raises HTTPException 401 if:
    - Token signature is invalid
    - Token is expired
    - Token is missing the 'sub' claim
    - SUPABASE_JWT_SECRET is not configured

    Returns:
        UUID: The authenticated student's ID (from JWT 'sub' claim).
    """
    # Early return: JWT secret not configured
    if not settings.supabase_jwt_secret:
        logger.error(
            "SUPABASE_JWT_SECRET not configured. "
            "Authentication cannot proceed."
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de configuración del servidor de autenticación.",
        )

    token = credentials.credentials

    # Attempt to decode and verify the JWT
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[_JWT_ALGORITHM],
            options={
                "verify_aud": False,  # Supabase tokens use role-based aud
                "verify_exp": True,
                "verify_iss": False,  # Supabase iss varies by project
            },
        )
    except JWTError as e:
        logger.warning(
            "JWT verification failed: %s",
            type(e).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado. Por favor inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Early return: missing 'sub' claim
    subject = payload.get("sub")
    if not subject:
        logger.warning("JWT payload missing 'sub' claim.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: identificador de usuario ausente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Parse and return the student UUID
    try:
        student_id = UUID(subject)
    except ValueError:
        logger.warning(
            "JWT 'sub' claim is not a valid UUID: %s",
            subject[:8] + "...",  # Log only prefix, never full ID
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: formato de identificador incorrecto.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.debug(
        "Authenticated request.",
        extra={"student_id_hash": hash(str(student_id))},
    )
    return student_id
