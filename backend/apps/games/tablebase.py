"""Probe tablebases Syzygy via API Lichess (≤7 pièces)."""

from __future__ import annotations

import logging
from urllib.parse import quote

import chess
import requests

logger = logging.getLogger(__name__)

LICHESS_TB = "https://tablebase.lichess.org/standard"


def probe_tablebase(fen: str) -> dict | None:
    """Retourne DTZ/DTC/win si position ≤7 pièces, sinon None."""
    try:
        board = chess.Board(fen)
    except ValueError:
        return None

    if len(board.piece_map()) > 7:
        return None

    try:
        resp = requests.get(f"{LICHESS_TB}?fen={quote(fen)}", timeout=5)
        if resp.status_code != 200:
            return None
        data = resp.json()
        category = data.get("category")
        dtz = data.get("dtz")
        dtm = data.get("dtm")
        return {
            "category": category,
            "dtz": dtz,
            "dtm": dtm,
            "checkmate": category == "mate",
            "draw": category in ("draw", "unknown"),
            "won": category == "win",
            "lost": category == "loss",
        }
    except Exception as exc:
        logger.debug("Tablebase probe failed: %s", exc)
        return None
