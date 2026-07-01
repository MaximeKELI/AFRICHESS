"""Segmentation ouverture / milieu / finale pour la revue de partie."""

from __future__ import annotations

import chess


def infer_phase(ply: int, fen_after: str | None = None) -> str:
    move_num = (ply + 1) // 2
    if move_num <= 10:
        return "opening"
    if move_num >= 35:
        return "endgame"
    if fen_after:
        try:
            board = chess.Board(fen_after)
            if len(board.piece_map()) <= 12:
                return "endgame"
        except ValueError:
            pass
    return "middlegame"


def fen_after_moves(start_fen: str, ucis: list[str]) -> str:
    board = chess.Board(start_fen)
    for uci in ucis:
        if len(uci) < 4:
            continue
        board.push(
            chess.Move.from_uci(
                uci[:4] + (uci[4] if len(uci) > 4 else "")
            )
        )
    return board.fen()


def build_analyzed_moves_json(evaluations, move_rows) -> list[dict]:
    """Construit best_moves_json avec eval_before et phase."""
    start = chess.Board().fen()
    ucis: list[str] = []
    rows: list[dict] = []
    for i, e in enumerate(evaluations):
        ucis.append(e.uci)
        fen_after = fen_after_moves(start, ucis)
        rows.append(
            {
                "uci": e.uci,
                "san": e.san,
                "eval": e.eval_after,
                "eval_before": e.eval_before,
                "class": e.classification,
                "cp_loss": e.centipawn_loss,
                "played_by_white": move_rows[i][1],
                "best_uci": e.best_uci,
                "best_san": e.best_san,
                "pv_san": e.pv_san,
                "phase": infer_phase(i, fen_after),
            }
        )
    return rows
