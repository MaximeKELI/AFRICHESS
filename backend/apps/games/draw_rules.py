"""Règles de nulle (répétition, etc.)."""

from __future__ import annotations

import chess

from django.utils import timezone

from .models import Game
from .variant_utils import board_from_fen, starting_position_for_variant


def board_from_game_moves(game) -> chess.Board:
    board = chess.Board()
    for m in game.moves.order_by("move_number"):
        board.push_uci(m.uci)
    return board


def _position_key(fen: str, variant: str) -> str:
    board = board_from_fen(fen, variant)
    key = board._transposition_key()
    ep = key[3] if key[3] is not None else -1
    return f"{key[0]}:{int(key[1])}:{key[2]}:{ep}"


def init_repetition_counts(fen: str, variant: str) -> dict[str, int]:
    return {_position_key(fen, variant): 1}


def bump_repetition_count(game: Game) -> None:
    """Enregistre la position courante (O(1), pas de replay des coups)."""
    key = _position_key(game.fen, game.variant)
    counts = dict(game.repetition_counts or {})
    counts[key] = counts.get(key, 0) + 1
    game.repetition_counts = counts


def rebuild_repetition_counts(game: Game) -> dict[str, int]:
    """Reconstruit les compteurs depuis l'historique (takeback, parties legacy)."""
    if game.chess960_position_id is not None:
        start_fen = chess.Board.from_chess960_pos(game.chess960_position_id).fen()
    else:
        start_fen, _ = starting_position_for_variant(game.variant)
    counts = init_repetition_counts(start_fen, game.variant)
    for move in game.moves.order_by("move_number"):
        fen = move.fen_after or game.fen
        key = _position_key(fen, game.variant)
        counts[key] = counts.get(key, 0) + 1
    return counts


def can_claim_threefold_from_game(game) -> bool:
    counts = game.repetition_counts
    if not counts and game.move_count > 0:
        counts = rebuild_repetition_counts(game)
        game.repetition_counts = counts
        game.save(update_fields=["repetition_counts"])
    if not counts:
        return False
    key = _position_key(game.fen, game.variant)
    return counts.get(key, 0) >= 3


def finalize_repetition_draw(game: Game) -> None:
    game.result = Game.Result.DRAW
    game.status = Game.Status.COMPLETED
    game.termination_reason = "repetition"
    game.ended_at = timezone.now()
    game.winner = None
