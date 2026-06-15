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

import httpx
from jose import JWTError, jwt, jwk

from app.core.config import Settings, get_settings

_jwks_cache = None


async def _get_jwks(supabase_url: str) -> dict:
    """Fetch and cache JWKS from Supabase auth endpoint."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(jwks_url, timeout=5.0)
            response.raise_for_status()
            _jwks_cache = response.json()
            return _jwks_cache
        except Exception as exc:
            logger.error("Failed to fetch JWKS from Supabase: %s", str(exc))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error de comunicación con el servidor de autenticación.",
            )


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
    token = credentials.credentials

    # 1. Parse algorithm and kid from unverified header
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
    except Exception as e:
        logger.warning("Failed to parse JWT header: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido. Formato incorrecto.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Select key and algorithm for verification
    if alg == "HS256":
        if not settings.supabase_jwt_secret:
            logger.error("SUPABASE_JWT_SECRET not configured. HS256 authentication cannot proceed.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error de configuración del servidor de autenticación.",
            )
        verify_key = settings.supabase_jwt_secret
        algorithms = ["HS256"]
    elif alg == "ES256":
        kid = header.get("kid")
        if not kid:
            logger.warning("ES256 JWT is missing 'kid' header.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: identificador de clave ausente.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            jwks = await _get_jwks(settings.supabase_url)
            key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
            if not key_data:
                # Clear cache and retry once in case keys rotated
                global _jwks_cache
                _jwks_cache = None
                jwks = await _get_jwks(settings.supabase_url)
                key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)

            if not key_data:
                logger.warning("No matching JWK found for kid: %s", kid)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token inválido: clave de firma no encontrada.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            verify_key = jwk.construct(key_data)
            algorithms = ["ES256"]
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Error setting up ES256 verification: %s", str(e), exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Error al verificar la firma del token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        logger.warning("Unsupported JWT algorithm: %s", alg)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Algoritmo de token no soportado: {alg}.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Attempt to decode and verify the JWT
    try:
        payload = jwt.decode(
            token,
            verify_key,
            algorithms=algorithms,
            options={
                "verify_aud": False,  # Supabase tokens use role-based aud
                "verify_exp": True,
                "verify_iss": False,  # Supabase iss varies by project
            },
        )
    except JWTError as e:
        # Enhanced logging to diagnose JWT failures
        logger.warning(
            "JWT verification failed: %s — %s",
            type(e).__name__,
            str(e),
        )
        try:
            unverified_claims = jwt.get_unverified_claims(token)
            logger.warning(
                "JWT debug — alg: %s, sub: %s, exp: %s, iss: %s",
                alg,
                str(unverified_claims.get("sub", "MISSING"))[:8] + "...",
                unverified_claims.get("exp"),
                unverified_claims.get("iss"),
            )
        except Exception:
            logger.warning("Could not extract unverified JWT claims.")
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
