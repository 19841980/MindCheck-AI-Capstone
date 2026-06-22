import pytest
from app.services.encryption_service import encrypt_content, decrypt_content

def test_encryption_roundtrip():
    """Verify that a plaintext string can be successfully encrypted and decrypted back to the original text."""
    original_text = "Esta es una bitácora de prueba confidencial con acentos y emojis 😰."
    
    # Encrypt
    encrypted = encrypt_content(original_text)
    assert encrypted != original_text
    assert len(encrypted) > 0
    
    # Decrypt
    decrypted = decrypt_content(encrypted)
    assert decrypted == original_text

def test_encrypt_empty_content_raises_error():
    """Verify that encrypting empty content raises a ValueError."""
    with pytest.raises(ValueError, match="No se puede cifrar contenido vacío."):
        encrypt_content("")

def test_decrypt_empty_content_raises_error():
    """Verify that decrypting empty content raises a ValueError."""
    with pytest.raises(ValueError, match="No se puede descifrar contenido vacío."):
        decrypt_content("")
