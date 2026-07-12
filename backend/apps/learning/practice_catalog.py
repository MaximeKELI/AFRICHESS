"""Catalogue Practice Lichess (PracticeSections.scala) — IDs d'études publiques."""

from __future__ import annotations

# Aligné sur modules/practice/src/main/PracticeSections.scala (lila)
PRACTICE_CATALOG: list[dict] = [
    {
        "slug": "checkmates",
        "name": "Checkmates",
        "order": 0,
        "studies": [
            {"lichess_id": "BJy6fEDf", "slug": "piece-checkmates-i", "title": "Piece Checkmates I", "desc": "Basic checkmates"},
            {"lichess_id": "fE4k21MW", "slug": "checkmate-patterns-i", "title": "Checkmate Patterns I", "desc": "Recognize the patterns"},
            {"lichess_id": "8yadFPpU", "slug": "checkmate-patterns-ii", "title": "Checkmate Patterns II", "desc": "Recognize the patterns"},
            {"lichess_id": "PDkQDt6u", "slug": "checkmate-patterns-iii", "title": "Checkmate Patterns III", "desc": "Recognize the patterns"},
            {"lichess_id": "96Lij7wH", "slug": "checkmate-patterns-iv", "title": "Checkmate Patterns IV", "desc": "Recognize the patterns"},
            {"lichess_id": "Rg2cMBZ6", "slug": "piece-checkmates-ii", "title": "Piece Checkmates II", "desc": "Challenging checkmates"},
            {"lichess_id": "ByhlXnmM", "slug": "knight-bishop-mate", "title": "Knight & Bishop Mate", "desc": "Interactive lesson"},
        ],
    },
    {
        "slug": "fundamental-tactics",
        "name": "Fundamental Tactics",
        "order": 1,
        "studies": [
            {"lichess_id": "9ogFv8Ac", "slug": "the-pin", "title": "The Pin", "desc": "Pin it to win it"},
            {"lichess_id": "tuoBxVE5", "slug": "the-skewer", "title": "The Skewer", "desc": "Yum - skewers!"},
            {"lichess_id": "Qj281y1p", "slug": "the-fork", "title": "The Fork", "desc": "Use the fork, Luke"},
            {"lichess_id": "MnsJEWnI", "slug": "discovered-attacks", "title": "Discovered Attacks", "desc": "Including discovered checks"},
            {"lichess_id": "RUQASaZm", "slug": "double-check", "title": "Double Check", "desc": "A very powerful tactic"},
            {"lichess_id": "o734CNqp", "slug": "overloaded-pieces", "title": "Overloaded Pieces", "desc": "They have too much work"},
            {"lichess_id": "ITWY4GN2", "slug": "zwischenzug", "title": "Zwischenzug", "desc": "In-between moves"},
            {"lichess_id": "lyVYjhPG", "slug": "x-ray", "title": "X-Ray", "desc": "Attacking through an enemy piece"},
        ],
    },
    {
        "slug": "advanced-tactics",
        "name": "Advanced Tactics",
        "order": 2,
        "studies": [
            {"lichess_id": "9cKgYrHb", "slug": "zugzwang", "title": "Zugzwang", "desc": "Being forced to move"},
            {"lichess_id": "g1fxVZu9", "slug": "interference", "title": "Interference", "desc": "Interpose a piece to great effect"},
            {"lichess_id": "s5pLU7Of", "slug": "greek-gift", "title": "Greek Gift", "desc": "Study the greek gift sacrifice"},
            {"lichess_id": "kdKpaYLW", "slug": "deflection", "title": "Deflection", "desc": "Distracting a defender"},
            {"lichess_id": "jOZejFWk", "slug": "attraction", "title": "Attraction", "desc": "Lure a piece to a bad square"},
            {"lichess_id": "49fDW0wP", "slug": "underpromotion", "title": "Underpromotion", "desc": "Promote - but not to a queen!"},
            {"lichess_id": "0YcGiH4Y", "slug": "desperado", "title": "Desperado", "desc": "A piece is lost, but it can still help"},
            {"lichess_id": "CgjKPvxQ", "slug": "counter-check", "title": "Counter Check", "desc": "Respond to a check with a check"},
            {"lichess_id": "udx042D6", "slug": "undermining", "title": "Undermining", "desc": "Remove the defending piece"},
            {"lichess_id": "Grmtwuft", "slug": "clearance", "title": "Clearance", "desc": "Get out of the way!"},
        ],
    },
    {
        "slug": "pawn-endgames",
        "name": "Pawn Endgames",
        "order": 3,
        "studies": [
            {"lichess_id": "xebrDvFe", "slug": "key-squares", "title": "Key Squares", "desc": "Reach a key square"},
            {"lichess_id": "A4ujYOer", "slug": "opposition", "title": "Opposition", "desc": "Take the opposition"},
            {"lichess_id": "pt20yRkT", "slug": "7th-rank-rook-pawn-queen", "title": "7th-Rank Rook Pawn", "desc": "Versus a Queen"},
        ],
    },
    {
        "slug": "rook-endgames",
        "name": "Rook Endgames",
        "order": 4,
        "studies": [
            {"lichess_id": "MkDViieT", "slug": "7th-rank-rook-pawn", "title": "7th-Rank Rook Pawn", "desc": "And Passive Rook vs Rook"},
            {"lichess_id": "pqUSUw8Y", "slug": "basic-rook-endgames", "title": "Basic Rook Endgames", "desc": "Lucena and Philidor"},
            {"lichess_id": "heQDnvq7", "slug": "intermediate-rook-endings", "title": "Intermediate Rook Endings", "desc": "Broaden your knowledge"},
            {"lichess_id": "wS23j5Tm", "slug": "practical-rook-endings", "title": "Practical Rook Endings", "desc": "Rook endings with several pawns"},
        ],
    },
]
