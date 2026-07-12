"""Puzzle Storm — 3 minutes, fails illimités, buffer infini (parité Lichess Storm)."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .models import Puzzle, PuzzleRushSession
from .random_sample import random_queryset
from .rush_battle import _timed_submit


# Courbe de difficulté simplifiée (inspirée StormSelector Lichess)
_STORM_BANDS = (
    (800, 1100, 8),
    (1100, 1400, 8),
    (1400, 1700, 8),
    (1700, 2000, 6),
    (2000, 2800, 6),
)


def _select_storm_puzzle_ids(total: int = 36) -> list[int]:
    ids: list[int] = []
    seen: set[int] = set()
    for lo, hi, n in _STORM_BANDS:
        qs = Puzzle.objects.filter(rating__gte=lo, rating__lt=hi)
        for p in random_queryset(qs, n):
            if p.id not in seen:
                seen.add(p.id)
                ids.append(p.id)
    if len(ids) < total:
        extra = random_queryset(Puzzle.objects.exclude(pk__in=seen), total - len(ids))
        ids.extend(p.id for p in extra)
    return ids[: max(total, len(ids))]


def ensure_puzzle_buffer(session: PuzzleRushSession, min_remaining: int = 8) -> None:
    remaining = len(session.puzzle_ids) - session.current_index
    if remaining >= min_remaining:
        return
    # Continuer la courbe autour du rating moyen des derniers puzzles
    last_ids = session.puzzle_ids[-5:] if session.puzzle_ids else []
    avg = 1500
    if last_ids:
        ratings = list(
            Puzzle.objects.filter(pk__in=last_ids).values_list("rating", flat=True)
        )
        if ratings:
            avg = sum(ratings) // len(ratings)
    lo, hi = max(600, avg - 200), avg + 350
    qs = Puzzle.objects.filter(rating__gte=lo, rating__lt=hi).exclude(
        pk__in=session.puzzle_ids[-30:]
    )
    extra = list(random_queryset(qs, 15))
    if len(extra) < 10:
        extra.extend(
            random_queryset(
                Puzzle.objects.exclude(pk__in=session.puzzle_ids[-40:]),
                15 - len(extra),
            )
        )
    session.puzzle_ids.extend(p.id for p in extra)
    session.save(update_fields=["puzzle_ids"])


def start_storm_session(user, duration_seconds: int = 180) -> PuzzleRushSession:
    puzzle_ids = _select_storm_puzzle_ids(36)
    if not puzzle_ids:
        puzzle_ids = [p.id for p in random_queryset(Puzzle.objects.all(), 30)]
    return PuzzleRushSession.objects.create(
        user=user,
        mode=PuzzleRushSession.Mode.STORM,
        puzzle_ids=puzzle_ids,
        ends_at=timezone.now() + timedelta(seconds=duration_seconds),
    )


def storm_submit(session: PuzzleRushSession, moves: list[str]) -> dict:
    """Storm : timer only — pas de limite d'erreurs (parité Lichess)."""
    if session.mode != PuzzleRushSession.Mode.STORM:
        from .rush_battle import rush_submit

        return rush_submit(session, moves)

    ensure_puzzle_buffer(session)
    result = _timed_submit(session, moves, max_misses=None, refill=True)
    if not result.get("completed"):
        ensure_puzzle_buffer(session)
        # Rafraîchir next_puzzle_id si buffer vient d'être étendu
        if result.get("next_puzzle_id") is None and session.current_index < len(session.puzzle_ids):
            result["next_puzzle_id"] = session.puzzle_ids[session.current_index]
    result["mode"] = "storm"
    # Ne jamais terminer Storm pour « misses »
    if result.get("reason") == "misses":
        result["reason"] = None
    return result
