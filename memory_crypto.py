# memory_crypto.py — AES-GCM file encrypt/decrypt using a token-derived key
from __future__ import annotations
import os, json, secrets
from pathlib import Path
from typing import Union
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.backends import default_backend

def _derive_key(token: str, salt: bytes) -> bytes:
    kdf = Scrypt(salt=salt, length=32, n=2**14, r=8, p=1, backend=default_backend())
    return kdf.derive(token.encode("utf-8"))

def _get_token() -> str:
    # Use your "core laws token" from env to avoid prompting in background tasks
    tok = os.getenv("ZANDALEE_CORE_LAWS_TOKEN")
    if not tok:
        raise RuntimeError("ZANDALEE_CORE_LAWS_TOKEN not set")
    return tok

def encrypt_bytes(plain: bytes, *, associated_data: bytes = b"") -> bytes:
    token = _get_token()
    salt = secrets.token_bytes(16)
    key = _derive_key(token, salt)
    aead = AESGCM(key)
    nonce = secrets.token_bytes(12)
    ct = aead.encrypt(nonce, plain, associated_data)
    return b"ZENC1" + salt + nonce + ct  # simple header: magic + salt + nonce + ciphertext

def decrypt_bytes(data: bytes, *, associated_data: bytes = b"") -> bytes:
    if not data.startswith(b"ZENC1"):
        # assume plaintext for legacy files
        return data
    off = 5
    salt = data[off:off+16]; off += 16
    nonce = data[off:off+12]; off += 12
    ct = data[off:]
    token = _get_token()
    key = _derive_key(token, salt)
    aead = AESGCM(key)
    return aead.decrypt(nonce, ct, associated_data)

def write_encrypted(path: Union[str, Path], text: str):
    b = text.encode("utf-8")
    enc = encrypt_bytes(b)
    Path(path).write_bytes(enc)

def read_decrypted_text(path: Union[str, Path]) -> str:
    data = Path(path).read_bytes()
    dec = decrypt_bytes(data)
    return dec.decode("utf-8", errors="replace")
