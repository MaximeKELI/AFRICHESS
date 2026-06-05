"""Limites fonctionnelles Free vs Gold vs Diamond."""

from __future__ import annotations

from django.utils import timezone

FREE_ANALYSIS_MOVES = 40
GOLD_ANALYSIS_MOVES = 80
DIAMOND_ANALYSIS_MOVES = 120
FREE_RUSH_PER_DAY = 3


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
    stats = user.stats
    today = timezone.now().date()
    if stats.puzzle_rush_last_date != today:
        return True, None
    if stats.puzzle_rush_daily_count >= FREE_RUSH_PER_DAY:
        return False, "puzzle_rush_limit"
    return True, None


def record_puzzle_rush_start(user) -> None:
    if not user or not user.is_authenticated or user.is_premium:
        return
    stats = user.stats
    today = timezone.now().date()
    if stats.puzzle_rush_last_date != today:
        stats.puzzle_rush_daily_count = 0
        stats.puzzle_rush_last_date = today
    stats.puzzle_rush_daily_count += 1
    stats.save(update_fields=["puzzle_rush_daily_count", "puzzle_rush_last_date"])
