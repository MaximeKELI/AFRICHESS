"""Détection anti-triche — temps réel (Python) + post-partie (C++)."""

from datetime import timedelta

from django.utils import timezone

from .fairplay_exempt import user_is_fairplay_exempt
from .fairplay_service import merge_telemetry
from .fairplay_telemetry import (
    sanitize_telemetry_patch,
    user_has_fairplay_consent,
)
from .models import Game, Move

MAX_MOVES_PER_MINUTE = 50
MIN_MOVE_INTERVAL_MS = 50
MAX_TAB_BLUR_PER_MOVE = 4
MAX_COPY_PASTE_PER_GAME = 8

_TAB_BLUR_MSG = (
    "Activité d'onglet suspecte pendant le coup"
)
_PASTE_MSG = "Copier-coller excessif détecté"


def validate_move_timing(
    game: Game,
    user,
    think_ms: int | None = None,
) -> dict | None:
    """Retourne {"error": ...} si suspect, None si OK."""
    if user_is_fairplay_exempt(user):
        return None
    if game.is_vs_ai:
        return None
    since = timezone.now() - timedelta(minutes=1)
    recent = Move.objects.filter(
        game=game,
        created_at__gte=since,
    ).count()
    if recent >= MAX_MOVES_PER_MINUTE:
        return {
            "error": "Trop de coups — activité suspecte",
            "code": "anticheat",
        }
    last = game.moves.order_by("-created_at").first()
    if last:
        delta = (timezone.now() - last.created_at).total_seconds() * 1000
        is_white = game.white_player_id == user.id
        same_side = last.played_by_white == is_white
        too_fast_server = (
            delta < MIN_MOVE_INTERVAL_MS and same_side
        )
        too_fast_client = (
            think_ms is not None
            and think_ms < MIN_MOVE_INTERVAL_MS
            and same_side
        )
        if too_fast_server or too_fast_client:
            return {
                "error": "Coup trop rapide",
                "code": "anticheat",
            }
    return None


def validate_move_telemetry(
    game: Game,
    user,
    telemetry: dict | None,
) -> dict | None:
    if user_is_fairplay_exempt(user):
        return None
    if game.is_vs_ai or not telemetry:
        return None
    if not user_has_fairplay_consent(user):
        return None
    try:
        raw_tab_blur = int(telemetry.get("tab_blur", 0) or 0)
    except (TypeError, ValueError):
        raw_tab_blur = 0
    if raw_tab_blur > MAX_TAB_BLUR_PER_MOVE:
        return {
            "error": _TAB_BLUR_MSG,
            "code": "anticheat",
        }
    telemetry = sanitize_telemetry_patch(telemetry)
    if not telemetry:
        return None
    tab_blur = int(telemetry.get("tab_blur", 0) or 0)
    if tab_blur > MAX_TAB_BLUR_PER_MOVE:
        return {
            "error": _TAB_BLUR_MSG,
            "code": "anticheat",
        }
    row = merge_telemetry(game, user, telemetry)
    row_data = row.data or {}
    total_paste = int(row_data.get("copy_paste_events", 0))
    if total_paste > MAX_COPY_PASTE_PER_GAME:
        return {
            "error": _PASTE_MSG,
            "code": "anticheat",
        }
    return None


def validate_move_fairplay(
    game: Game,
    user,
    *,
    think_ms: int | None = None,
    telemetry: dict | None = None,
) -> dict | None:
    """Anti-triche temps réel (pas de verdict moteur en partie)."""
    if user_is_fairplay_exempt(user):
        return None
    err = validate_move_timing(
        game,
        user,
        think_ms=think_ms,
    )
    if err is not None:
        return err
    return validate_move_telemetry(game, user, telemetry)
