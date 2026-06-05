"""Chess variant helpers (Chess960, Crazyhouse, etc.)."""

from __future__ import annotations

import random

import chess
import chess.variant


def generate_chess960_start(position_id: int | None = None) -> tuple[str, int]:
    """Return (fen, position_id) for a Chess960 starting position."""
    pos_id = position_id if position_id is not None else random.randint(0, 959)
    board = chess.Board.from_chess960_pos(pos_id)
    return board.fen(), pos_id


def board_from_fen(fen: str, variant: str = "standard") -> chess.Board:
    if variant == "chess960":
        return chess.Board(fen, chess960=True)
    if variant == "crazyhouse":
        return chess.variant.CrazyhouseBoard(fen)
    if variant == "kingofthehill":
        return chess.variant.KingOfTheHillBoard(fen)
    if variant == "threecheck":
        return chess.variant.ThreeCheckBoard(fen)
    return chess.Board(fen)


def apply_move(fen: str, uci: str, variant: str = "standard") -> tuple[str, str, bool] | None:
    """Returns (new_fen, san, is_game_over) or None if illegal."""
    board = board_from_fen(fen, variant)
    try:
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            return None
        san = board.san(move)
        board.push(move)
        return board.fen(), san, board.is_game_over()
    except ValueError:
        return None


def parse_pockets(fen: str) -> dict[str, list[str]]:
    """Pocket Crazyhouse depuis le FEN ([PN]…)."""
    import re

    m = re.search(r"\[([^\]]*)\]", fen)
    if not m:
        return {"white": [], "black": []}
    raw = m.group(1)
    return {
        "white": [c for c in raw if c.isupper()],
        "black": [c for c in raw if c.islower()],
    }


def legal_moves_uci(fen: str, variant: str = "standard") -> list[str]:
    board = board_from_fen(fen, variant)
    return [m.uci() for m in board.legal_moves]


def pick_variant_move(fen: str, variant: str, elo: int = 1200) -> str | None:
    """Heuristic move for non-standard variants (Stockfish plays standard only)."""
    board = board_from_fen(fen, variant)
    legal = list(board.legal_moves)
    if not legal:
        return None
    if elo <= 800:
        return random.choice(legal).uci()
    if elo <= 1400:
        captures = [m for m in legal if board.is_capture(m)]
        if captures and random.random() < 0.6:
            return random.choice(captures).uci()
        return random.choice(legal).uci()
    # stronger: prefer checks and captures
    scored: list[tuple[int, chess.Move]] = []
    for m in legal:
        board.push(m)
        score = 0
        if board.is_check():
            score += 3
        board.pop()
        if board.is_capture(m):
            score += 2
        if m.promotion:
            score += 4
        scored.append((score, m))
    scored.sort(key=lambda x: x[0], reverse=True)
    top = [m for s, m in scored if s >= scored[0][0]]
    return random.choice(top).uci()
