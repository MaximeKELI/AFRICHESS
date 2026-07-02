"""Cache Redis pour profils publics."""

from __future__ import annotations

from django.core.cache import cache

PUBLIC_PROFILE_TTL = 180
FEATURED_AFRICAN_TTL = 300
FEATURED_AFRICAN_KEY = "users:featured:african"


def public_profile_key(username: str) -> str:
    return f"user:public:{username.lower()}"


def get_public_profile(username: str) -> dict | None:
    return cache.get(public_profile_key(username))


def set_public_profile(username: str, data: dict) -> None:
    cache.set(public_profile_key(username), data, PUBLIC_PROFILE_TTL)


def invalidate_public_profile(username: str) -> None:
    if username:
        cache.delete(public_profile_key(username))


def get_featured_african() -> list | None:
    return cache.get(FEATURED_AFRICAN_KEY)


def set_featured_african(data: list) -> None:
    cache.set(FEATURED_AFRICAN_KEY, data, FEATURED_AFRICAN_TTL)


def invalidate_featured_african() -> None:
    cache.delete(FEATURED_AFRICAN_KEY)
