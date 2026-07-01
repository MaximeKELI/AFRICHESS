"""Comptes exemptés de surveillance Fair Play / anti-triche."""

from __future__ import annotations

from django.conf import settings


def user_is_fairplay_exempt(user) -> bool:
    """True si le joueur ne doit pas être surveillé ni sanctionné automatiquement."""
    if not user or not getattr(user, "is_authenticated", True):
        return False
    if getattr(user, "fairplay_exempt", False):
        return True
    usernames = getattr(settings, "FAIRPLAY_EXEMPT_USERNAMES", ()) or ()
    return user.username in usernames
