"""Validation serveur de la télémétrie Fair Play — anti-spoofing."""

from __future__ import annotations

from typing import Any

MAX_TAB_BLUR_PER_MOVE = 4
MAX_WINDOW_SWITCH_PER_MOVE = 6
MAX_COPY_PASTE_PER_MOVE = 3
MAX_DEVTOOLS_PER_MOVE = 2
MAX_PREMOVE_PER_MOVE = 20
MAX_FOCUS_LOSS_MS_PER_MOVE = 120_000
MAX_MOUSE_ENTROPY = 1.0


def sanitize_telemetry_patch(raw: dict[str, Any] | None) -> dict[str, Any] | None:
    """Normalise et borne les champs télémétrie client."""
    if not raw or not isinstance(raw, dict):
        return None

    def _int(key: str, cap: int) -> int:
        try:
            return max(0, min(cap, int(raw.get(key, 0) or 0)))
        except (TypeError, ValueError):
            return 0

    def _float(key: str, cap: float) -> float:
        try:
            val = float(raw.get(key, 0) or 0)
            return max(0.0, min(cap, val))
        except (TypeError, ValueError):
            return 0.0

    patch = {
        "tab_blur": _int("tab_blur", MAX_TAB_BLUR_PER_MOVE),
        "window_switch": _int("window_switch", MAX_WINDOW_SWITCH_PER_MOVE),
        "copy_paste": _int("copy_paste", MAX_COPY_PASTE_PER_MOVE),
        "devtools": _int("devtools", MAX_DEVTOOLS_PER_MOVE),
        "premove": _int("premove", MAX_PREMOVE_PER_MOVE),
        "focus_loss_ms": _int("focus_loss_ms", MAX_FOCUS_LOSS_MS_PER_MOVE),
        "mouse_entropy": _float("mouse_entropy", MAX_MOUSE_ENTROPY),
    }
    if not any(patch.values()):
        return None
    return patch


def user_has_fairplay_consent(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    try:
        consent = user.fairplay_consent
    except Exception:
        return False
    from .models import FairPlayUserConsent

    return consent.consent_version == FairPlayUserConsent.CONSENT_VERSION
