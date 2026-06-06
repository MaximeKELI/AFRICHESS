"""Échange one-time OAuth code → JWT (évite les tokens dans l'URL)."""

import secrets

from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()
_PREFIX = "oauth_code:"
_TTL = 60


def create_oauth_code(user) -> str:
    code = secrets.token_urlsafe(32)
    cache.set(f"{_PREFIX}{code}", user.pk, timeout=_TTL)
    return code


def consume_oauth_code(code: str):
    if not code or len(code) > 128:
        return None
    key = f"{_PREFIX}{code}"
    user_id = cache.get(key)
    if user_id is None:
        return None
    cache.delete(key)
    try:
        return User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return None
