"""Helpers pour enregistrer des événements côté serveur."""

from __future__ import annotations

import hashlib
from typing import Any

from django.contrib.auth import get_user_model

from .models import UserActivityEvent

User = get_user_model()


def _hash_ip(ip: str | None) -> str:
    if not ip:
        return ""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def log_event(
    event_type: str,
    *,
    user=None,
    session_id: str = "",
    path: str = "",
    element: str = "",
    label: str = "",
    metadata: dict[str, Any] | None = None,
    request=None,
) -> UserActivityEvent:
    ip_hash = ""
    user_agent = ""
    if request is not None:
        ip_hash = _hash_ip(request.META.get("REMOTE_ADDR"))
        user_agent = (request.META.get("HTTP_USER_AGENT") or "")[:512]
        if user is None and getattr(request, "user", None) and request.user.is_authenticated:
            user = request.user

    return UserActivityEvent.objects.create(
        user=user,
        session_id=session_id or "",
        event_type=event_type,
        path=path[:512],
        element=element[:256],
        label=label[:256],
        metadata=metadata or {},
        ip_hash=ip_hash,
        user_agent=user_agent,
    )


def log_events_batch(events: list[dict], *, user=None, request=None) -> int:
    """Ingestion batch depuis le frontend."""
    ip_hash = ""
    user_agent = ""
    if request is not None:
        ip_hash = _hash_ip(request.META.get("REMOTE_ADDR"))
        user_agent = (request.META.get("HTTP_USER_AGENT") or "")[:512]
        if user is None and getattr(request, "user", None) and request.user.is_authenticated:
            user = request.user

    rows = []
    for ev in events[:100]:
        et = ev.get("event_type", UserActivityEvent.EventType.OTHER)
        if et not in UserActivityEvent.EventType.values:
            et = UserActivityEvent.EventType.OTHER
        rows.append(
            UserActivityEvent(
                user=user,
                session_id=(ev.get("session_id") or "")[:64],
                event_type=et,
                path=(ev.get("path") or "")[:512],
                element=(ev.get("element") or "")[:256],
                label=(ev.get("label") or "")[:256],
                metadata=ev.get("metadata") or {},
                ip_hash=ip_hash,
                user_agent=user_agent,
            )
        )
    if rows:
        UserActivityEvent.objects.bulk_create(rows)
    return len(rows)
