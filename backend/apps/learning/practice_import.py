"""Parse Practice chapters depuis PGN Lichess + extraction UCI / goal."""

from __future__ import annotations

import re
from typing import Any

import chess
import chess.pgn
import io

from .study_pgn_io import import_study_pgn

GOAL_TAG = re.compile(r"\[(?:PracticeGoal|Goal)\s+\"([^\"]+)\"\]", re.I)


def _infer_goal(headers: dict[str, str], fen: str, solution: list[str]) -> tuple[str, int | None]:
    raw = headers.get("PracticeGoal") or headers.get("Goal") or ""
    raw_l = raw.lower().strip()
    if raw_l.startswith("matein"):
        n = re.search(r"(\d+)", raw_l)
        return "mateIn", int(n.group(1)) if n else len(solution) or 1
    if raw_l == "mate" or "mate" in raw_l:
        return "mate", None
    if raw_l.startswith("draw"):
        n = re.search(r"(\d+)", raw_l)
        return "drawIn", int(n.group(1)) if n else None
    # Heuristique : si la ligne mène au mat, mateIn
    if solution:
        try:
            board = chess.Board(fen) if fen else chess.Board()
            for uci in solution:
                board.push_uci(uci)
            if board.is_checkmate():
                # coups du joueur ≈ ceil(len/2) si on commence
                player_moves = (len(solution) + 1) // 2
                return "mateIn", max(1, player_moves)
        except Exception:
            pass
    return "generic", None


def _mainline_uci(pgn_movetext: str, fen: str) -> list[str]:
    text = pgn_movetext.strip()
    if not text:
        return []
    header = ""
    if fen:
        header = f'[FEN "{fen}"]\n[SetUp "1"]\n\n'
    try:
        game = chess.pgn.read_game(io.StringIO(header + text))
    except Exception:
        return []
    if game is None:
        return []
    board = game.board()
    uci: list[str] = []
    node = game
    while node.variations:
        node = node.variation(0)
        if node.move:
            uci.append(node.move.uci())
            board.push(node.move)
    return uci


def parse_practice_pgn(pgn_text: str) -> list[dict[str, Any]]:
    """
    Transforme un export étude Lichess en chapitres Practice.
    """
    chapters_raw = import_study_pgn(pgn_text)
    out: list[dict[str, Any]] = []
    for i, ch in enumerate(chapters_raw):
        fen = ch.get("initial_fen") or chess.STARTING_FEN
        # Re-parse headers from original block if needed — import_study_pgn drops custom tags
        solution = _mainline_uci(ch.get("pgn") or "", fen)
        # Goal depuis tags dans le pgn movetext block
        goal, goal_moves = "generic", None
        block_headers = {}
        # Chercher PracticeGoal dans le pgn stocké
        m = GOAL_TAG.search(ch.get("pgn") or "")
        if m:
            block_headers["PracticeGoal"] = m.group(1)
        goal, goal_moves = _infer_goal(block_headers, fen, solution)
        out.append(
            {
                "title": ch["title"],
                "order": ch.get("order", i),
                "fen": fen[:120],
                "pgn": ch.get("pgn") or "",
                "solution_uci": solution,
                "goal": goal,
                "goal_moves": goal_moves,
            }
        )
    return out
