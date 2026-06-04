"""Crée les SocialApp Google/GitHub depuis les variables d'environnement."""

from django.conf import settings


def ensure_oauth_apps():
    if not getattr(settings, "AUTO_SETUP_OAUTH_APPS", True):
        return
    from allauth.socialaccount.models import SocialApp
    from django.contrib.sites.models import Site

    site = Site.objects.get_current()
    specs = [
        (
            "google",
            "Google",
            getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", ""),
            getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", ""),
        ),
        (
            "github",
            "GitHub",
            getattr(settings, "GITHUB_OAUTH_CLIENT_ID", ""),
            getattr(settings, "GITHUB_OAUTH_CLIENT_SECRET", ""),
        ),
    ]
    for provider, name, client_id, secret in specs:
        if not client_id or not secret:
            continue
        app, _ = SocialApp.objects.update_or_create(
            provider=provider,
            defaults={"name": name, "client_id": client_id, "secret": secret},
        )
        app.sites.set([site.pk])
