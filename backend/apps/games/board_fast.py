"""Chemin Python unifié — un seul parse Board pour complexité + coup (standard)."""

from __future__ import annotations

from typing import Any

import chess


def _complexity_from_board(board: chess.Board) -> int:
    piece_vals = {
        chess.PAWN: 100,
        chess.KNIGHT: 320,
        chess.BISHOP: 330,
        chess.ROOK: 500,
        chess.QUEEN: 900,
    }
    material = 0
    for piece in board.piece_map().values():
        v = piece_vals.get(piece.piece_type, 0)
        material += v if piece.color == chess.WHITE else -v
    complexity = min(
        800,
        abs(material) // 2
        + board.fullmove_number * 6
        + len(list(board.legal_moves)) * 2,
    )
    if board.is_check():
        complexity += 100
    return complexity


def apply_standard_move(
    fen: str,
    uci: str,
    *,
    with_complexity: bool = True,
) -> dict[str, Any] | None:
    """Applique un coup UCI ; None si illégal."""
    try:
        board = chess.Board(fen)
        complexity_pre = _complexity_from_board(board) if with_complexity else None
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            return None
        san = board.san(move)
        board.push(move)
        out: dict[str, Any] = {
            "ok": True,
            "fen": board.fen(),
            "san": san,
            "game_over": board.is_game_over(),
        }
        if with_complexity:
            out["complexity_pre"] = complexity_pre
        return out
    except ValueError:
        return None


def try_standard_move(
    fen: str,
    uci: str,
    *,
    with_complexity: bool = True,
) -> dict[str, Any] | None:
    """Native C++ d'abord, sinon Python unifié."""
    from .board_native import try_standard_move as native_try

    native = native_try(fen, uci, with_complexity=with_complexity)
    if native is not None:
        return native
    result = apply_standard_move(fen, uci, with_complexity=with_complexity)
    if result is None:
        return {"ok": False}
    return result
