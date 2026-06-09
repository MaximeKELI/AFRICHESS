"""Vues auth durcies — throttle + révocation access token."""

from django.conf import settings
from dj_rest_auth.views import LoginView, LogoutView

from apps.common.throttles import AuthAnonThrottle, AuthUserThrottle

from .authentication import denylist_access_token


class SecureLoginView(LoginView):
    throttle_classes = [] if settings.DEBUG else [AuthAnonThrottle]


class SecureLogoutView(LogoutView):
    throttle_classes = [AuthUserThrottle, AuthAnonThrottle]

    def post(self, request, *args, **kwargs):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if auth.startswith("Bearer "):
            denylist_access_token(auth[7:].strip())
        return super().post(request, *args, **kwargs)
