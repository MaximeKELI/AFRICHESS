"""Limites fonctionnelles Free vs Gold vs Diamond."""

from __future__ import annotations

from django.utils import timezone

FREE_ANALYSIS_MOVES = 40
GOLD_ANALYSIS_MOVES = 80
DIAMOND_ANALYSIS_MOVES = 120
FREE_RUSH_PER_DAY = 3


def _user_stats(user):
    from .models import UserStats

    stats, _ = UserStats.objects.get_or_create(user=user)
    return stats


def max_analysis_moves(user) -> int:
    if user and user.is_authenticated:
        if getattr(user, "is_diamond", False):
            return DIAMOND_ANALYSIS_MOVES
        if user.is_premium:
            return GOLD_ANALYSIS_MOVES
    return FREE_ANALYSIS_MOVES


def analysis_engine_depth(user) -> int:
    if user and getattr(user, "is_diamond", False):
        return 16
    if user and user.is_premium:
        return 14
    return 12


def can_start_puzzle_rush(user) -> tuple[bool, str | None]:
    if not user or not user.is_authenticated:
        return True, None
    if user.is_premium:
        return True, None
    stats = _user_stats(user)
    today = timezone.now().date()
    if stats.puzzle_rush_last_date != today:
        return True, None
    if stats.puzzle_rush_daily_count >= FREE_RUSH_PER_DAY:
        return False, "puzzle_rush_limit"
    return True, None


def record_puzzle_rush_start(user) -> None:
    if not user or not user.is_authenticated or user.is_premium:
        return
    stats = _user_stats(user)
    today = timezone.now().date()
    if stats.puzzle_rush_last_date != today:
        stats.puzzle_rush_daily_count = 0
        stats.puzzle_rush_last_date = today
    stats.puzzle_rush_daily_count += 1
    stats.save(update_fields=["puzzle_rush_daily_count", "puzzle_rush_last_date"])


def redact_game_analysis_payload(data: dict, user) -> dict:
    """Limite l'analyse visible selon le tier du viewer (pas de l'analyseur)."""
    limit = max_analysis_moves(user)
    out = dict(data)
    moves = out.get("best_moves_json") or []
    if isinstance(moves, list) and len(moves) > limit:
        out["best_moves_json"] = moves[:limit]
        out["analysis_truncated"] = True
        out["analysis_move_limit"] = limit
    moments = out.get("key_moments_json")
    if isinstance(moments, list) and len(moments) > limit:
        out["key_moments_json"] = moments[:limit]
    return out
