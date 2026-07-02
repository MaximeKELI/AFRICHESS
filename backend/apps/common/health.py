"""Healthcheck public pour monitoring (sans auth)."""

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny


def _database_ok() -> bool:
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True
    except Exception:
        return False


def _cache_ok() -> bool:
    try:
        cache.set("health:ping", 1, 10)
        return cache.get("health:ping") == 1
    except Exception:
        return False


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(_request):
    db_ok = _database_ok()
    cache_ok = _cache_ok()
    healthy = db_ok and cache_ok
    status = 200 if healthy else 503
    return JsonResponse(
        {
            "status": "ok" if healthy else "degraded",
            "database": db_ok,
            "cache": cache_ok,
        },
        status=status,
    )
