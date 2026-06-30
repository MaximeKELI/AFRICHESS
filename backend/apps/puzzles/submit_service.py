"""Soumission puzzle unifiée (Elo, streak, stats, XP learning)."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.learning.progression import record_puzzle_result
from apps.ratings.services import RatingService
from apps.users.models import UserStats

from .models import Puzzle, PuzzleAttempt


def _ensure_user_stats(user):
    UserStats.objects.get_or_create(user=user)


def _update_daily_streak(user, puzzle: Puzzle, solved: bool) -> int:
    _ensure_user_stats(user)
    stats = user.stats
    if not solved or not puzzle.is_daily:
        return stats.daily_puzzle_streak
    today = timezone.now().date()
    if stats.daily_puzzle_last_date == today:
        return stats.daily_puzzle_streak
    if stats.daily_puzzle_last_date == today - timedelta(days=1):
        stats.daily_puzzle_streak += 1
    else:
        stats.daily_puzzle_streak = 1
    stats.daily_puzzle_last_date = today
    stats.save(update_fields=["daily_puzzle_streak", "daily_puzzle_last_date"])
    return stats.daily_puzzle_streak


def process_puzzle_submission(user, puzzle: Puzzle, moves: list[str], time_seconds: int) -> dict:
    """Enregistre une tentative et applique Elo, streak, stats globales et XP learning."""
    solved = moves == puzzle.solution_moves

    PuzzleAttempt.objects.create(
        user=user,
        puzzle=puzzle,
        solved=solved,
        moves_played=moves,
        time_seconds=time_seconds,
    )
    puzzle.plays_count += 1

    streak = 0
    puzzle_elo = None
    puzzle_elo_change = 0

    if solved:
        _ensure_user_stats(user)
        user.stats.puzzles_solved += 1
        user.stats.save(update_fields=["puzzles_solved"])
        streak = _update_daily_streak(user, puzzle, solved)

    svc = RatingService()
    before = svc.get_or_create_rating(user, "puzzle").elo
    after_rating = svc.update_puzzle_rating(user, puzzle.rating, solved)
    puzzle_elo = after_rating.elo
    puzzle_elo_change = puzzle_elo - before

    puzzle.save(update_fields=["plays_count"])

    record_puzzle_result(user, solved)

    return {
        "solved": solved,
        "correct_moves": puzzle.solution_moves if solved else None,
        "daily_streak": streak,
        "puzzle_elo": puzzle_elo,
        "puzzle_elo_change": puzzle_elo_change,
        "xp_gained": 10 if solved else 0,
    }
