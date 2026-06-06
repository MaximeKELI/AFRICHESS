"""Authentification JWT pour les WebSockets Django Channels."""

from django.conf import settings
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.users.authentication import is_access_token_denied

User = get_user_model()


def _extract_ws_token(scope) -> str | None:
    """Auth via Sec-WebSocket-Protocol uniquement (sauf WS_ALLOW_QUERY_TOKEN)."""
    for name, value in scope.get("headers", []):
        if name == b"sec-websocket-protocol":
            for proto in value.decode().split(","):
                proto = proto.strip()
                if proto.startswith("bearer."):
                    return proto[7:]
    if getattr(settings, "WS_ALLOW_QUERY_TOKEN", False):
        query = parse_qs(scope.get("query_string", b"").decode())
        return query.get("token", [None])[0]
    return None


@database_sync_to_async
def _user_from_token(token: str):
    try:
        if is_access_token_denied(token):
            return None
        access = AccessToken(token)
        user_id = access.get("user_id")
        return User.objects.get(pk=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return None


class JwtAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            token = _extract_ws_token(scope)
            if token:
                user = await _user_from_token(token)
                scope["user"] = user if user else AnonymousUser()
        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    from channels.auth import AuthMiddlewareStack

    return JwtAuthMiddleware(AuthMiddlewareStack(inner))
