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
        next_url = (
            request.GET.get("next")
            or request.session.get("socialaccount_login_redirect_url")
            or request.session.get("next")
        )
        if next_url and str(next_url).startswith("africhess://"):
            base = str(next_url).rstrip("/")
            sep = "&" if "?" in base else "?"
            return f"{base}{sep}code={code}"
        base = settings.FRONTEND_URL.rstrip("/")
        return f"{base}/auth/callback?code={code}"
