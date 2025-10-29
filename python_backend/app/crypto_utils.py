from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import os

def get_encryption_key():
    """Get encryption key from environment variable"""
    key_hex = os.getenv('ENCRYPTION_KEY')
    if not key_hex:
        raise ValueError("ENCRYPTION_KEY environment variable not set")
    return bytes.fromhex(key_hex[:64])

def decrypt_credential(encrypted_text: str) -> str:
    """
    Decrypt a credential that was encrypted by the Node.js backend
    Format: iv:authTag:encrypted
    """
    try:
        parts = encrypted_text.split(':')
        if len(parts) != 3:
            raise ValueError('Invalid encrypted format')

        iv = bytes.fromhex(parts[0])
        auth_tag = bytes.fromhex(parts[1])
        encrypted = bytes.fromhex(parts[2])

        key = get_encryption_key()

        # Create decryptor
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv, auth_tag),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()

        # Decrypt
        decrypted = decryptor.update(encrypted) + decryptor.finalize()

        return decrypted.decode('utf-8')
    except Exception as e:
        raise Exception(f"Failed to decrypt credential: {str(e)}")
