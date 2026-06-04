"""Règles de nulle (répétition, etc.)."""

import chess

from django.utils import timezone

from .models import Game


def board_from_game_moves(game) -> chess.Board:
    board = chess.Board()
    for m in game.moves.order_by("move_number"):
        board.push_uci(m.uci)
    return board


def can_claim_threefold_from_game(game) -> bool:
    return board_from_game_moves(game).can_claim_threefold_repetition()


def finalize_repetition_draw(game: Game) -> None:
    game.result = Game.Result.DRAW
    game.status = Game.Status.COMPLETED
    game.termination_reason = "repetition"
    game.ended_at = timezone.now()
    game.winner = None
