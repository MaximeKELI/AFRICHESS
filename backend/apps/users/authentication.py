"""JWT avec liste de révocation access token (logout immédiat)."""

import time

from django.core.cache import cache
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import AccessToken


def denylist_access_token(token_str: str) -> None:
    try:
        token = AccessToken(token_str)
        jti = token.get("jti")
        exp = token.get("exp")
        if not jti or not exp:
            return
        ttl = max(1, int(exp) - int(time.time()))
        cache.set(f"jwt_deny:{jti}", 1, timeout=ttl)
    except Exception:
        return


def is_access_token_denied(token_str: str) -> bool:
    try:
        token = AccessToken(token_str)
        return bool(cache.get(f"jwt_deny:{token.get('jti')}"))
    except Exception:
        return True


class AfrichessJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        validated = super().get_validated_token(raw_token)
        if cache.get(f"jwt_deny:{validated.get('jti')}"):
            raise InvalidToken("Token révoqué")
        return validated
