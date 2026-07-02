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


def _recent_moves_context(game: Game) -> tuple[Move | None, int]:
    """Dernier coup + coups dans la dernière minute (une requête)."""
    since = timezone.now() - timedelta(minutes=1)
    moves = list(
        Move.objects.filter(game=game).order_by("-move_number")[
            : MAX_MOVES_PER_MINUTE + 1
        ]
    )
    last = moves[0] if moves else None
    recent = sum(1 for move in moves if move.created_at >= since)
    return last, recent


def validate_move_timing(
    game: Game,
    user,
    think_ms: int | None = None,
    *,
    last_move: Move | None = None,
    recent_count: int | None = None,
) -> dict | None:
    """Retourne {"error": ...} si suspect, None si OK."""
    if user_is_fairplay_exempt(user):
        return None
    if game.is_vs_ai:
        return None
    if last_move is None or recent_count is None:
        last_move, recent_count = _recent_moves_context(game)
    if recent_count >= MAX_MOVES_PER_MINUTE:
        return {
            "error": "Trop de coups — activité suspecte",
            "code": "anticheat",
        }
    if last_move:
        delta = (timezone.now() - last_move.created_at).total_seconds() * 1000
        is_white = (
            game.white_player is not None
            and game.white_player.pk == user.pk
        )
        same_side = last_move.played_by_white == is_white
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
    """Valide la télémétrie client (onglet, copier-coller)."""
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


def validate_clock_drift(
    game: Game,
    user,
    think_ms: int | None = None,
    *,
    last_move: Move | None = None,
) -> dict | None:
    """Bloque les écarts extrêmes client vs serveur (spoofing temps)."""
    from django.conf import settings

    from .fairplay_integrity import detect_clock_drift_ms

    if game.is_vs_ai:
        return None
    drift = detect_clock_drift_ms(game, user, think_ms, last_move=last_move)
    if drift is None:
        return None
    block_ms = int(getattr(settings, "FAIRPLAY_CLOCK_DRIFT_BLOCK_MS", 12000))
    if drift >= block_ms and think_ms is not None and think_ms < 800:
        return {
            "error": "Horloge client incohérente",
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
    last_move, recent_count = _recent_moves_context(game)
    for check in (
        lambda: validate_move_timing(
            game, user, think_ms=think_ms,
            last_move=last_move, recent_count=recent_count,
        ),
        lambda: validate_clock_drift(
            game, user, think_ms=think_ms, last_move=last_move,
        ),
        lambda: validate_move_telemetry(game, user, telemetry),
    ):
        err = check()
        if err:
            return err
    return None
