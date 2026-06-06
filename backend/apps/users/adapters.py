"""Redirection OAuth vers le frontend avec code échangeable (pas de JWT dans l'URL)."""

from django.conf import settings

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

from .oauth_exchange import create_oauth_code


class AfrichessSocialAccountAdapter(DefaultSocialAccountAdapter):
    def get_login_redirect_url(self, request):
        user = request.user
        if not user.is_authenticated:
            return settings.FRONTEND_URL
        code = create_oauth_code(user)
        base = settings.FRONTEND_URL.rstrip("/")
        return f"{base}/auth/callback?code={code}"
