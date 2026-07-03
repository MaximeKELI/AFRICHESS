"""Limites fonctionnelles Free vs Gold vs Diamond."""

from __future__ import annotations

from django.utils import timezone

# Profondeur moteur par tier (analyse manuelle / approfondie).
FREE_ANALYSIS_DEPTH = 12
GOLD_ANALYSIS_DEPTH = 14
DIAMOND_ANALYSIS_DEPTH = 16

# Profondeur plus légère pour l'analyse auto post-partie (latence).
FREE_AUTO_ANALYSIS_DEPTH = 8
GOLD_AUTO_ANALYSIS_DEPTH = 10
DIAMOND_AUTO_ANALYSIS_DEPTH = 12

# Rétrocompat API — plus de plafond de coups.
FREE_ANALYSIS_MOVES = None
GOLD_ANALYSIS_MOVES = None
DIAMOND_ANALYSIS_MOVES = None

FREE_RUSH_PER_DAY = 3


def _user_stats(user):
    from .models import UserStats

    stats, _ = UserStats.objects.get_or_create(user=user)
    return stats


def max_analysis_moves(user) -> int | None:
    """None = analyse et affichage sur tous les coups de la partie."""
    return None


def analysis_engine_depth(user) -> int:
    if user and getattr(user, "is_diamond", False):
        return DIAMOND_ANALYSIS_DEPTH
    if user and user.is_premium:
        return GOLD_ANALYSIS_DEPTH
    return FREE_ANALYSIS_DEPTH


def auto_analysis_engine_depth(user) -> int:
    """Profondeur Stockfish pour l'analyse automatique en arrière-plan."""
    if user and getattr(user, "is_diamond", False):
        return DIAMOND_AUTO_ANALYSIS_DEPTH
    if user and user.is_premium:
        return GOLD_AUTO_ANALYSIS_DEPTH
    return FREE_AUTO_ANALYSIS_DEPTH


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
    """Retourne l'analyse complète (plus de troncature par tier)."""
    return dict(data)
