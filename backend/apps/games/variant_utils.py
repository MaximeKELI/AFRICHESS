"""Chess variant helpers (Chess960, etc.)."""

from __future__ import annotations

import random

import chess


def generate_chess960_start(position_id: int | None = None) -> tuple[str, int]:
    """Return (fen, position_id) for a Chess960 starting position."""
    pos_id = position_id if position_id is not None else random.randint(0, 959)
    board = chess.Board.from_chess960_pos(pos_id)
    return board.fen(), pos_id
