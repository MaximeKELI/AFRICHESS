"""Redirection OAuth vers le frontend avec jetons JWT."""

from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class AfrichessSocialAccountAdapter(DefaultSocialAccountAdapter):
    def get_login_redirect_url(self, request):
        user = request.user
        if not user.is_authenticated:
            return settings.FRONTEND_URL
        refresh = RefreshToken.for_user(user)
        base = settings.FRONTEND_URL.rstrip("/")
        return (
            f"{base}/auth/callback"
            f"?access={refresh.access_token}&refresh={refresh}"
        )
