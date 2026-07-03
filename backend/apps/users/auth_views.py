"""Vues auth durcies — throttle + révocation access token + cookies HttpOnly."""

from dj_rest_auth.views import LoginView
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.common.throttles import AuthAnonThrottle, AuthUserThrottle, LoginBurstThrottle

from .authentication import denylist_access_token
from .jwt_cookies import (
    apply_httponly_refresh_response,
    clear_refresh_cookie,
    refresh_cookie_name,
    refresh_httponly_enabled,
    set_refresh_cookie,
)


class SecureLoginView(LoginView):
    throttle_classes = [LoginBurstThrottle, AuthAnonThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return apply_httponly_refresh_response(response)


class SecureLogoutView(APIView):
    """Révoque access + refresh (cookie HttpOnly ou body JSON)."""

    throttle_classes = [AuthUserThrottle, AuthAnonThrottle]

    def post(self, request, *args, **kwargs):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if auth.startswith("Bearer "):
            denylist_access_token(auth[7:].strip())

        refresh = request.data.get("refresh")
        if not refresh and refresh_httponly_enabled():
            refresh = request.COOKIES.get(refresh_cookie_name())

        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except Exception:
                pass

        response = Response({"detail": "Successfully logged out."}, status=200)
        clear_refresh_cookie(response)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Refresh depuis cookie HttpOnly ou body JSON (rétrocompatibilité)."""

    def post(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data or {})
        if refresh_httponly_enabled() and not data.get("refresh"):
            cookie_val = request.COOKIES.get(refresh_cookie_name())
            if cookie_val:
                data["refresh"] = cookie_val

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            response = Response(
                {"detail": "Token is invalid or has been revoked."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_refresh_cookie(response)
            return response
        validated = serializer.validated_data

        body = {"access": validated["access"]}
        if not refresh_httponly_enabled() and validated.get("refresh"):
            body["refresh"] = validated["refresh"]

        response = Response(body, status=200)
        if refresh_httponly_enabled() and validated.get("refresh"):
            set_refresh_cookie(response, validated["refresh"])
        return response
