"""Logique Puzzle Rush, Survival et Puzzle Battles (parité Lichess Storm/Racer)."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .models import Puzzle, PuzzleBattle, PuzzleBattleQueue, PuzzleRushSession
from .random_sample import random_queryset
from .uci import moves_match_solution


def start_rush_session(user, duration_seconds: int = 180) -> PuzzleRushSession:
    puzzles = random_queryset(Puzzle.objects.all(), 20)
    return PuzzleRushSession.objects.create(
        user=user,
        mode=PuzzleRushSession.Mode.RUSH,
        puzzle_ids=[p.id for p in puzzles],
        ends_at=timezone.now() + timedelta(seconds=duration_seconds),
    )


def _session_next_puzzle(session: PuzzleRushSession) -> Puzzle | None:
    if session.status != PuzzleRushSession.Status.ACTIVE:
        return None
    if session.current_index >= len(session.puzzle_ids):
        return None
    return Puzzle.objects.get(pk=session.puzzle_ids[session.current_index])


def _timed_submit(
    session: PuzzleRushSession,
    moves: list[str],
    *,
    max_misses: int | None,
    refill: bool = False,
) -> dict:
    """
    Submit commun Rush/Storm.
    - Toujours avancer l'index après une tentative (succès ou échec).
    - max_misses=None → pas de fin par erreurs (Storm Lichess).
    - max_misses=3 → Rush style Chess.com.
    """
    if session.status != PuzzleRushSession.Status.ACTIVE:
        return {"error": "Session terminée", "completed": True, "score": session.score}

    if timezone.now() > session.ends_at:
        session.status = PuzzleRushSession.Status.COMPLETED
        session.save(update_fields=["status"])
        return {
            "completed": True,
            "score": session.score,
            "misses": session.misses,
            "reason": "timeout",
            "solved": False,
        }

    if refill:
        from .storm import ensure_puzzle_buffer

        ensure_puzzle_buffer(session)

    idx = session.current_index
    if idx >= len(session.puzzle_ids):
        session.status = PuzzleRushSession.Status.COMPLETED
        session.save(update_fields=["status"])
        return {
            "completed": True,
            "score": session.score,
            "misses": session.misses,
            "solved": False,
        }

    puzzle = Puzzle.objects.get(pk=session.puzzle_ids[idx])
    solved = moves_match_solution(moves, puzzle.solution_moves)

    # Toujours passer au puzzle suivant (parité Storm / Rush moderne)
    session.current_index += 1
    if solved:
        session.score += 1
    else:
        session.misses += 1

    if max_misses is not None and session.misses >= max_misses:
        session.status = PuzzleRushSession.Status.COMPLETED
    elif session.current_index >= len(session.puzzle_ids):
        if refill:
            from .storm import ensure_puzzle_buffer

            ensure_puzzle_buffer(session, min_remaining=8)
        if session.current_index >= len(session.puzzle_ids):
            session.status = PuzzleRushSession.Status.COMPLETED

    session.save()
    next_puzzle = _session_next_puzzle(session)

    return {
        "solved": solved,
        "score": session.score,
        "misses": session.misses,
        "completed": session.status == PuzzleRushSession.Status.COMPLETED,
        "next_puzzle_id": next_puzzle.id if next_puzzle else None,
        "time_left": max(0, int((session.ends_at - timezone.now()).total_seconds())),
        "reason": "misses" if (
            session.status == PuzzleRushSession.Status.COMPLETED
            and max_misses is not None
            and session.misses >= max_misses
            and timezone.now() <= session.ends_at
        ) else None,
    }


def rush_submit(session: PuzzleRushSession, moves: list[str]) -> dict:
    """Rush : 3 min, 3 erreurs max, avance toujours après une tentative."""
    return _timed_submit(session, moves, max_misses=3, refill=False)


def start_survival_session(user) -> PuzzleRushSession:
    """Survival : une erreur élimine, puzzles illimités."""
    puzzles = random_queryset(Puzzle.objects.all(), 50)
    return PuzzleRushSession.objects.create(
        user=user,
        mode=PuzzleRushSession.Mode.SURVIVAL,
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
    solved = moves_match_solution(moves, puzzle.solution_moves)
    if solved:
        session.score += 1
        session.current_index += 1
    else:
        session.misses += 1
        session.status = PuzzleRushSession.Status.COMPLETED

    session.save()
    next_puzzle = _session_next_puzzle(session)

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
        opponent = opponent_entry.user
        PuzzleBattleQueue.objects.filter(user=user).delete()
        opponent_entry.delete()
        waiting = (
            PuzzleBattle.objects.filter(player1=opponent, status=PuzzleBattle.Status.WAITING)
            .order_by("-id")
            .first()
        )
        if waiting:
            waiting.player2 = user
            waiting.puzzle_ids = puzzle_ids
            waiting.current_index = 0
            waiting.index1 = 0
            waiting.index2 = 0
            waiting.score1 = 0
            waiting.score2 = 0
            waiting.status = PuzzleBattle.Status.ACTIVE
            waiting.save(
                update_fields=[
                    "player2",
                    "puzzle_ids",
                    "current_index",
                    "index1",
                    "index2",
                    "score1",
                    "score2",
                    "status",
                ]
            )
            return waiting
        return PuzzleBattle.objects.create(
            player1=opponent,
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


def _battle_player_index(battle: PuzzleBattle, user) -> int | None:
    if user.id == battle.player1_id:
        return battle.index1
    if user.id == battle.player2_id:
        return battle.index2
    return None


def _set_battle_player_index(battle: PuzzleBattle, user, value: int) -> None:
    if user.id == battle.player1_id:
        battle.index1 = value
    elif user.id == battle.player2_id:
        battle.index2 = value


def battle_puzzle_for_user(battle: PuzzleBattle, user) -> Puzzle | None:
    """Puzzle courant du joueur (progression indépendante type Racer)."""
    if battle.status != PuzzleBattle.Status.ACTIVE:
        return None
    idx = _battle_player_index(battle, user)
    if idx is None or idx >= len(battle.puzzle_ids):
        return None
    return Puzzle.objects.get(pk=battle.puzzle_ids[idx])


def battle_submit(battle: PuzzleBattle, user, moves: list[str]) -> dict:
    if battle.status != PuzzleBattle.Status.ACTIVE:
        return {"error": "Combat terminé", "completed": True}

    idx = _battle_player_index(battle, user)
    if idx is None:
        return {"error": "Non participant"}

    if idx >= len(battle.puzzle_ids):
        return {
            "solved": False,
            "completed": battle.status == PuzzleBattle.Status.COMPLETED,
            "score1": battle.score1,
            "score2": battle.score2,
            "player1_id": battle.player1_id,
            "player2_id": battle.player2_id,
            "winner_id": battle.winner_id,
        }

    puzzle = Puzzle.objects.get(pk=battle.puzzle_ids[idx])
    solved = moves_match_solution(moves, puzzle.solution_moves)

    # Avance toujours (succès ou échec) — progression indépendante
    _set_battle_player_index(battle, user, idx + 1)
    if solved:
        if user.id == battle.player1_id:
            battle.score1 += 1
        else:
            battle.score2 += 1

    # Terminé quand les deux joueurs ont fini la liste
    if battle.index1 >= len(battle.puzzle_ids) and battle.index2 >= len(battle.puzzle_ids):
        battle.status = PuzzleBattle.Status.COMPLETED
        if battle.score1 > battle.score2:
            battle.winner = battle.player1
        elif battle.score2 > battle.score1:
            battle.winner = battle.player2
        else:
            battle.winner = None

    # current_index = min des deux (affichage legacy / polling)
    battle.current_index = min(battle.index1, battle.index2)
    battle.save()

    next_puzzle = battle_puzzle_for_user(battle, user)

    return {
        "solved": solved,
        "score1": battle.score1,
        "score2": battle.score2,
        "player1_id": battle.player1_id,
        "player2_id": battle.player2_id,
        "completed": battle.status == PuzzleBattle.Status.COMPLETED,
        "winner_id": battle.winner_id,
        "next_puzzle_id": next_puzzle.id if next_puzzle else None,
        "correct_moves": None if solved else puzzle.solution_moves,
        "your_index": _battle_player_index(battle, user),
    }
