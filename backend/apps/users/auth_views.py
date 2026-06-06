"""Vues auth durcies — throttle + révocation access token."""

from dj_rest_auth.views import LoginView, LogoutView
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.throttles import AuthAnonThrottle, AuthUserThrottle

from .authentication import denylist_access_token


class SecureLoginView(LoginView):
    throttle_classes = [AuthAnonThrottle]


class SecureLogoutView(LogoutView):
    throttle_classes = [AuthUserThrottle, AuthAnonThrottle]

    def logout(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if auth.startswith("Bearer "):
            denylist_access_token(auth[7:].strip())
        refresh = request.data.get("refresh")
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except (InvalidToken, TokenError, AttributeError):
                pass
        return Response({"detail": "Déconnecté"}, status=status.HTTP_200_OK)
