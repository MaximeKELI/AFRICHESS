"""Authentification JWT pour les WebSockets Django Channels."""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


def _extract_ws_token(scope) -> str | None:
    """Préfère Sec-WebSocket-Protocol bearer.<token> (pas de fuite dans les logs URL)."""
    for name, value in scope.get("headers", []):
        if name == b"sec-websocket-protocol":
            for proto in value.decode().split(","):
                proto = proto.strip()
                if proto.startswith("bearer."):
                    return proto[7:]
    query = parse_qs(scope.get("query_string", b"").decode())
    return query.get("token", [None])[0]


@database_sync_to_async
def _user_from_token(token: str):
    try:
        access = AccessToken(token)
        user_id = access.get("user_id")
        return User.objects.get(pk=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return None


class JwtAuthMiddleware(BaseMiddleware):
    """
    Authentifie via Sec-WebSocket-Protocol: bearer.<jwt> (recommandé)
    ou ?token=<access_jwt> (rétrocompatibilité).
    """

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            token = _extract_ws_token(scope)
            if token:
                user = await _user_from_token(token)
                if user:
                    scope["user"] = user
                else:
                    scope["user"] = AnonymousUser()
        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    from channels.auth import AuthMiddlewareStack

    return JwtAuthMiddleware(AuthMiddlewareStack(inner))
