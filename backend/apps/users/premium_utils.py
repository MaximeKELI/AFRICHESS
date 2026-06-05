"""Limites fonctionnelles Free vs Premium."""

from __future__ import annotations

from django.utils import timezone

FREE_ANALYSIS_MOVES = 40
PREMIUM_ANALYSIS_MOVES = 80
FREE_RUSH_PER_DAY = 3


def max_analysis_moves(user) -> int:
    if user and user.is_authenticated and user.is_premium:
        return PREMIUM_ANALYSIS_MOVES
    return FREE_ANALYSIS_MOVES


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
