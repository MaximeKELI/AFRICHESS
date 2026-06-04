"""Authentification JWT pour les WebSockets Django Channels."""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


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
    Authentifie via ?token=<access_jwt> (recommandé pour Next.js).
    Complète AuthMiddlewareStack (session) si token absent.
    """

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            query = parse_qs(scope.get("query_string", b"").decode())
            token = query.get("token", [None])[0]
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
