"""Vues auth durcies — throttle + révocation access token + cookies HttpOnly."""

from django.conf import settings
from dj_rest_auth.views import LoginView, LogoutView
from rest_framework_simplejwt.views import TokenRefreshView

from apps.common.throttles import AuthAnonThrottle, AuthUserThrottle

from .authentication import denylist_access_token
from .jwt_cookies import apply_httponly_refresh_response, clear_refresh_cookie, refresh_httponly_enabled, set_refresh_cookie


class SecureLoginView(LoginView):
    throttle_classes = [] if settings.DEBUG else [AuthAnonThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        return apply_httponly_refresh_response(response)


class SecureLogoutView(LogoutView):
    throttle_classes = [AuthUserThrottle, AuthAnonThrottle]

    def post(self, request, *args, **kwargs):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if auth.startswith("Bearer "):
            denylist_access_token(auth[7:].strip())
        response = super().post(request, *args, **kwargs)
        clear_refresh_cookie(response)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Refresh depuis cookie HttpOnly ou body JSON (rétrocompatibilité)."""

    def post(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data or {})
        if refresh_httponly_enabled() and not data.get("refresh"):
            cookie_val = request.COOKIES.get("refresh_token")
            if cookie_val:
                data["refresh"] = cookie_val
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        from rest_framework.response import Response

        validated = serializer.validated_data
        response = Response(validated, status=200)
        new_refresh = validated.get("refresh")
        if new_refresh and refresh_httponly_enabled():
            body = {"access": validated["access"]}
            response = Response(body, status=200)
            set_refresh_cookie(response, new_refresh)
        elif refresh_httponly_enabled() and "refresh" in validated:
            apply_httponly_refresh_response(response)
        return response
