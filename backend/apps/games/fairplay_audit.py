"""Journal d'audit Fair Play — traçabilité staff et ops."""

from __future__ import annotations

from typing import Any

from .models import FairPlayAuditLog


def _client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    return (request.META.get("REMOTE_ADDR") or "")[:45] or None


def log_fairplay_audit(
    *,
    action: str,
    staff=None,
    target_type: str = "",
    target_id: str = "",
    request=None,
    metadata: dict[str, Any] | None = None,
) -> FairPlayAuditLog:
    return FairPlayAuditLog.objects.create(
        staff=staff,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else "",
        ip_address=_client_ip(request),
        metadata=metadata or {},
    )
