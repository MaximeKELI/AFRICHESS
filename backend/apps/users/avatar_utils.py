"""URL d'avatar exposée à l'API — fichier uploadé si présent, sinon null (preset côté client)."""

from __future__ import annotations


def uploaded_avatar_url(user) -> str | None:
    if not user.avatar:
        return None
    try:
        if user.avatar.storage.exists(user.avatar.name):
            return user.avatar.url
    except Exception:
        return None
    return None
