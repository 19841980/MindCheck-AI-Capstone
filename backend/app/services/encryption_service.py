"""
MindCheck — AES-256-GCM Encryption Service.

Handles encryption/decryption of emotional journal content.
Per §5.2: content is encrypted at application level BEFORE persistence.

This module is CPU-bound. Callers must use run_in_executor()
to avoid blocking the async event loop (§4.4).

Key management:
- ENCRYPTION_KEY is loaded from environment variables only.
- Never logged, never exposed in API responses.
- Key rotation requires re-encrypting all existing entries.
"""

import base64
import hashlib
import logging
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings

logger = logging.getLogger("mindcheck.encryption")

# Nonce length for AES-GCM (96 bits = 12 bytes, NIST recommended)
_NONCE_LENGTH = 12


def _derive_key() -> bytes:
    """
    Derive a 256-bit key from the ENCRYPTION_KEY environment variable.

    If the env var is not a valid 32-byte hex string, it is hashed
    with SHA-256 to produce a deterministic 256-bit key.
    """
    settings = get_settings()
    raw_key = settings.encryption_key

    if not raw_key:
        raise RuntimeError(
            "ENCRYPTION_KEY no está configurada. "
            "El cifrado de bitácoras emocionales es obligatorio."
        )

    # Try to use the key directly if it is valid hex of correct length
    try:
        key_bytes = bytes.fromhex(raw_key)
        if len(key_bytes) == 32:
            return key_bytes
    except ValueError:
        pass

    # Fallback: derive 256-bit key via SHA-256 hash
    return hashlib.sha256(raw_key.encode("utf-8")).digest()


def encrypt_content(plaintext: str) -> str:
    """
    Encrypt plaintext using AES-256-GCM.

    Returns a base64-encoded string containing:
        nonce (12 bytes) || ciphertext || tag (16 bytes)

    The nonce is generated randomly for each encryption operation.
    """
    if not plaintext:
        raise ValueError("No se puede cifrar contenido vacío.")

    key = _derive_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(_NONCE_LENGTH)

    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)

    # Prepend nonce to ciphertext for storage
    payload = nonce + ciphertext
    return base64.b64encode(payload).decode("utf-8")


def decrypt_content(encrypted_b64: str) -> str:
    """
    Decrypt an AES-256-GCM encrypted base64 string.

    Expects the format produced by encrypt_content():
        base64( nonce (12 bytes) || ciphertext || tag (16 bytes) )
    """
    if not encrypted_b64:
        raise ValueError("No se puede descifrar contenido vacío.")

    key = _derive_key()
    aesgcm = AESGCM(key)

    payload = base64.b64decode(encrypted_b64)
    nonce = payload[:_NONCE_LENGTH]
    ciphertext = payload[_NONCE_LENGTH:]

    plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext_bytes.decode("utf-8")
