"""Handicaps matériels (Odds Chess) — FEN prédéfinis."""

ODDS_PRESETS = {
    "none": None,
    "knight": "rnbqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "bishop": "rn1qkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "rook": "rnbqk1nr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "queen": "rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    "queen_knight": "rnb1kb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
}


def fen_for_odds(odds_key: str) -> str | None:
    return ODDS_PRESETS.get(odds_key or "none")
