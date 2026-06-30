"""Cookies HttpOnly pour refresh JWT (Phase 10)."""

from __future__ import annotations

from django.conf import settings


def refresh_httponly_enabled() -> bool:
    return bool(getattr(settings, "JWT_REFRESH_HTTPONLY", False))


def refresh_cookie_name() -> str:
    return getattr(settings, "REST_AUTH", {}).get("JWT_AUTH_REFRESH_COOKIE", "refresh_token")


def set_refresh_cookie(response, refresh_token: str) -> None:
    if not refresh_httponly_enabled():
        return
    max_age = int(getattr(settings, "SIMPLE_JWT", {}).get("REFRESH_TOKEN_LIFETIME").total_seconds())
    response.set_cookie(
        refresh_cookie_name(),
        refresh_token,
        max_age=max_age,
        httponly=True,
        secure=getattr(settings, "REST_AUTH", {}).get("JWT_AUTH_SECURE", not settings.DEBUG),
        samesite=getattr(settings, "REST_AUTH", {}).get("JWT_AUTH_SAMESITE", "Lax"),
        path="/",
    )


def clear_refresh_cookie(response) -> None:
    response.delete_cookie(refresh_cookie_name(), path="/")


def apply_httponly_refresh_response(response):
    """Retire refresh du body JSON et le place en cookie HttpOnly."""
    if not refresh_httponly_enabled() or not hasattr(response, "data"):
        return response
    data = dict(response.data) if isinstance(response.data, dict) else {}
    refresh = data.pop("refresh", None)
    if refresh:
        set_refresh_cookie(response, refresh)
        response.data = data
    return response
