"""Puzzle Storm — 3 minutes, puzzles illimités (équivalent Lichess Storm)."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .models import Puzzle, PuzzleRushSession
from .random_sample import random_queryset
from .rush_battle import rush_submit


def start_storm_session(user, duration_seconds: int = 180) -> PuzzleRushSession:
    puzzles = random_queryset(Puzzle.objects.all(), 30)
    return PuzzleRushSession.objects.create(
        user=user,
        mode=PuzzleRushSession.Mode.STORM,
        puzzle_ids=[p.id for p in puzzles],
        ends_at=timezone.now() + timedelta(seconds=duration_seconds),
    )


def _ensure_puzzle_buffer(session: PuzzleRushSession, min_remaining: int = 8) -> None:
    remaining = len(session.puzzle_ids) - session.current_index
    if remaining >= min_remaining:
        return
    extra = random_queryset(Puzzle.objects.all(), 20)
    session.puzzle_ids.extend([p.id for p in extra])
    session.save(update_fields=["puzzle_ids"])


def storm_submit(session: PuzzleRushSession, moves: list[str]) -> dict:
    if session.mode != PuzzleRushSession.Mode.STORM:
        return rush_submit(session, moves)
    _ensure_puzzle_buffer(session)
    result = rush_submit(session, moves)
    if not result.get("completed") and result.get("next_puzzle_id"):
        _ensure_puzzle_buffer(session)
    result["mode"] = "storm"
    return result
