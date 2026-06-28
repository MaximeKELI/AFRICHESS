"""Détection anti-triche — temps réel (Python) + post-partie (C++)."""

from datetime import timedelta

from django.utils import timezone

from .fairplay_service import merge_telemetry, run_fairplay_analysis
from .models import Game, Move

MAX_MOVES_PER_MINUTE = 45
MIN_MOVE_INTERVAL_MS = 80
MAX_TAB_BLUR_PER_MOVE = 3
MAX_COPY_PASTE_PER_GAME = 5
REALTIME_SCORE_BLOCK = 85.0


def validate_move_timing(game: Game, user, think_ms: int | None = None) -> dict | None:
    """Retourne {"error": ...} si suspect, None si OK."""
    if game.is_vs_ai:
        return None
    since = timezone.now() - timedelta(minutes=1)
    recent = Move.objects.filter(game=game, created_at__gte=since).count()
    if recent >= MAX_MOVES_PER_MINUTE:
        return {"error": "Trop de coups — activité suspecte", "code": "anticheat"}
    last = game.moves.order_by("-created_at").first()
    if last:
        delta = (timezone.now() - last.created_at).total_seconds() * 1000
        same_side = last.played_by_white == (game.white_player_id == user.id)
        if delta < MIN_MOVE_INTERVAL_MS and same_side:
            return {"error": "Coup trop rapide", "code": "anticheat"}
    if think_ms is not None and think_ms < 40 and game.mode not in (Game.Mode.BULLET,):
        if game.move_count > 4:
            return {"error": "Réflexion anormalement courte", "code": "anticheat"}
    return None


def validate_move_telemetry(game: Game, user, telemetry: dict | None) -> dict | None:
    if game.is_vs_ai or not telemetry:
        return None
    tab_blur = int(telemetry.get("tab_blur", 0) or 0)
    copy_paste = int(telemetry.get("copy_paste", 0) or 0)
    if tab_blur > MAX_TAB_BLUR_PER_MOVE:
        return {"error": "Activité d'onglet suspecte pendant le coup", "code": "anticheat"}
    row = merge_telemetry(game, user, telemetry)
    total_paste = int((row.data or {}).get("copy_paste_events", 0))
    if total_paste > MAX_COPY_PASTE_PER_GAME:
        return {"error": "Copier-coller excessif détecté", "code": "anticheat"}
    return None


def validate_realtime_fairplay(game: Game, user) -> dict | None:
    """Analyse légère C++ sur les derniers coups (parties classées)."""
    if game.is_vs_ai or not game.is_rated or game.move_count < 8:
        return None
    result = run_fairplay_analysis(game, user, analysis_mode="realtime")
    if not result:
        return None
    score = float(result.get("overall_score", 0))
    if score >= REALTIME_SCORE_BLOCK:
        return {
            "error": "Comportement suspect détecté — partie signalée pour revue",
            "code": "anticheat",
            "fairplay_score": score,
        }
    return None


def validate_move_fairplay(
    game: Game,
    user,
    *,
    think_ms: int | None = None,
    telemetry: dict | None = None,
) -> dict | None:
    for check in (
        lambda: validate_move_timing(game, user, think_ms=think_ms),
        lambda: validate_move_telemetry(game, user, telemetry),
        lambda: validate_realtime_fairplay(game, user),
    ):
        err = check()
        if err:
            return err
    return None
