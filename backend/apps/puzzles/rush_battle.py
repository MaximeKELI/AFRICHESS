"""Logique Puzzle Rush et Puzzle Battles."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .models import Puzzle, PuzzleBattle, PuzzleBattleQueue, PuzzleRushSession
from .random_sample import random_queryset


def start_rush_session(user, duration_seconds: int = 180) -> PuzzleRushSession:
    puzzles = random_queryset(Puzzle.objects.all(), 20)
    return PuzzleRushSession.objects.create(
        user=user,
        puzzle_ids=[p.id for p in puzzles],
        ends_at=timezone.now() + timedelta(seconds=duration_seconds),
    )


def rush_submit(session: PuzzleRushSession, moves: list[str]) -> dict:
    if session.status != PuzzleRushSession.Status.ACTIVE:
        return {"error": "Session terminée"}
    if timezone.now() > session.ends_at:
        session.status = PuzzleRushSession.Status.COMPLETED
        session.save(update_fields=["status"])
        return {"completed": True, "score": session.score, "reason": "timeout"}

    idx = session.current_index
    if idx >= len(session.puzzle_ids):
        session.status = PuzzleRushSession.Status.COMPLETED
        session.save(update_fields=["status"])
        return {"completed": True, "score": session.score}

    puzzle = Puzzle.objects.get(pk=session.puzzle_ids[idx])
    solved = moves == puzzle.solution_moves
    if solved:
        session.score += 1
        session.current_index += 1
    else:
        session.misses += 1

    if session.misses >= 3:
        session.status = PuzzleRushSession.Status.COMPLETED
    elif session.current_index >= len(session.puzzle_ids):
        session.status = PuzzleRushSession.Status.COMPLETED

    session.save()
    next_puzzle = None
    if session.status == PuzzleRushSession.Status.ACTIVE and session.current_index < len(session.puzzle_ids):
        next_puzzle = Puzzle.objects.get(pk=session.puzzle_ids[session.current_index])

    return {
        "solved": solved,
        "score": session.score,
        "misses": session.misses,
        "completed": session.status == PuzzleRushSession.Status.COMPLETED,
        "next_puzzle_id": next_puzzle.id if next_puzzle else None,
        "time_left": max(0, int((session.ends_at - timezone.now()).total_seconds())),
    }


def start_survival_session(user) -> PuzzleRushSession:
    """Survival : une erreur élimine, puzzles illimités."""
    puzzles = random_queryset(Puzzle.objects.all(), 50)
    return PuzzleRushSession.objects.create(
        user=user,
        puzzle_ids=[p.id for p in puzzles],
        ends_at=timezone.now() + timedelta(hours=2),
    )


def survival_submit(session: PuzzleRushSession, moves: list[str]) -> dict:
    if session.status != PuzzleRushSession.Status.ACTIVE:
        return {"error": "Session terminée", "completed": True, "score": session.score}

    idx = session.current_index
    if idx >= len(session.puzzle_ids):
        extra = random_queryset(Puzzle.objects.all(), 10)
        session.puzzle_ids.extend([p.id for p in extra])
        session.save(update_fields=["puzzle_ids"])

    puzzle = Puzzle.objects.get(pk=session.puzzle_ids[idx])
    solved = moves == puzzle.solution_moves
    if solved:
        session.score += 1
        session.current_index += 1
    else:
        session.misses += 1
        session.status = PuzzleRushSession.Status.COMPLETED

    session.save()
    next_puzzle = None
    if session.status == PuzzleRushSession.Status.ACTIVE and session.current_index < len(session.puzzle_ids):
        next_puzzle = Puzzle.objects.get(pk=session.puzzle_ids[session.current_index])

    return {
        "solved": solved,
        "score": session.score,
        "misses": session.misses,
        "completed": session.status == PuzzleRushSession.Status.COMPLETED,
        "next_puzzle_id": next_puzzle.id if next_puzzle else None,
        "mode": "survival",
    }


def join_battle_queue(user) -> PuzzleBattle | None:
    opponent_entry = PuzzleBattleQueue.objects.exclude(user=user).order_by("joined_at").first()
    puzzles = random_queryset(Puzzle.objects.all(), 5)
    puzzle_ids = [p.id for p in puzzles]

    if opponent_entry:
        PuzzleBattleQueue.objects.filter(user=user).delete()
        opponent_entry.delete()
        return PuzzleBattle.objects.create(
            player1=opponent_entry.user,
            player2=user,
            puzzle_ids=puzzle_ids,
            status=PuzzleBattle.Status.ACTIVE,
        )

    PuzzleBattleQueue.objects.update_or_create(user=user, defaults={})
    waiting = PuzzleBattle.objects.filter(player1=user, status=PuzzleBattle.Status.WAITING).first()
    if waiting:
        return waiting
    return PuzzleBattle.objects.create(
        player1=user,
        puzzle_ids=puzzle_ids,
        status=PuzzleBattle.Status.WAITING,
    )


def battle_submit(battle: PuzzleBattle, user, moves: list[str]) -> dict:
    if battle.status != PuzzleBattle.Status.ACTIVE:
        return {"error": "Combat terminé"}

    idx = battle.current_index
    if idx >= len(battle.puzzle_ids):
        battle.status = PuzzleBattle.Status.COMPLETED
        battle.save(update_fields=["status"])
        return {"completed": True}

    puzzle = Puzzle.objects.get(pk=battle.puzzle_ids[idx])
    solved = moves == puzzle.solution_moves
    if not solved:
        return {"solved": False, "correct_moves": puzzle.solution_moves}

    if user.id == battle.player1_id:
        battle.score1 += 1
    elif user.id == battle.player2_id:
        battle.score2 += 1
    else:
        return {"error": "Non participant"}

    battle.current_index += 1
    if battle.current_index >= len(battle.puzzle_ids):
        battle.status = PuzzleBattle.Status.COMPLETED
        if battle.score1 > battle.score2:
            battle.winner = battle.player1
        elif battle.score2 > battle.score1:
            battle.winner = battle.player2
    battle.save()

    return {
        "solved": True,
        "score1": battle.score1,
        "score2": battle.score2,
        "completed": battle.status == PuzzleBattle.Status.COMPLETED,
        "winner_id": battle.winner_id,
    }
