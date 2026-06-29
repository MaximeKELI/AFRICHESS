"""TOTP 2FA (RFC 6238) — compatible Google Authenticator."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import struct
import time


def generate_totp_secret() -> str:
    raw = secrets.token_bytes(20)
    return base64.b32encode(raw).decode("ascii").rstrip("=")


def _normalize_secret(secret: str) -> bytes:
    padded = secret.upper().replace(" ", "")
    pad = (8 - len(padded) % 8) % 8
    padded += "=" * pad
    return base64.b32decode(padded, casefold=True)


def totp_code(secret: str, for_time: int | None = None, digits: int = 6, period: int = 30) -> str:
    t = int(for_time if for_time is not None else time.time()) // period
    msg = struct.pack(">Q", t)
    key = _normalize_secret(secret)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code_int = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(code_int % (10**digits)).zfill(digits)


def verify_totp(secret: str, code: str, window: int = 1) -> bool:
    code = (code or "").strip()
    if not code.isdigit() or len(code) != 6:
        return False
    now = int(time.time())
    for delta in range(-window, window + 1):
        if hmac.compare_digest(totp_code(secret, now + delta * 30), code):
            return True
    return False


def provisioning_uri(secret: str, username: str, issuer: str = "AFRICHESS") -> str:
    from urllib.parse import quote

    label = quote(f"{issuer}:{username}")
    return f"otpauth://totp/{label}?secret={secret}&issuer={quote(issuer)}"
