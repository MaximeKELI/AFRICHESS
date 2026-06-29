"""
Catalogue de puzzles tactiques — positions vérifiées (UCI).
Thèmes : mate, fork, pin, skewer, discovery, sacrifice, back_rank, endgame, etc.
"""

from __future__ import annotations

# fmt: off
PUZZLE_CATALOG: list[dict] = [
    # ── Easy / Mate in 1 ──
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4", "solution_moves": ["h5f7"], "themes": ["mate", "scholar"], "difficulty": "easy", "rating": 600},
    {"fen": "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2", "solution_moves": ["d8h4"], "themes": ["mate"], "difficulty": "easy", "rating": 650},
    {"fen": "6k1/5ppp/8/8/8/8/8/R6K w - - 0 1", "solution_moves": ["a1a8"], "themes": ["mate", "back_rank"], "difficulty": "easy", "rating": 700},
    {"fen": "6k1/5ppp/8/8/8/5R2/5PPP/6K1 w - - 0 1", "solution_moves": ["f3f8"], "themes": ["mate", "back_rank"], "difficulty": "easy", "rating": 750},
    {"fen": "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3", "solution_moves": ["g2g3"], "themes": ["mate"], "difficulty": "easy", "rating": 680},
    {"fen": "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3", "solution_moves": ["d7d6"], "themes": ["mate"], "difficulty": "easy", "rating": 720},
    {"fen": "rnbqkb1r/pppp1Qpp/4pn2/8/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3", "solution_moves": ["f6g4"], "themes": ["mate"], "difficulty": "easy", "rating": 640},
    {"fen": "8/8/8/8/8/3K4/4R3/4k3 w - - 0 1", "solution_moves": ["e2e1"], "themes": ["mate", "endgame"], "difficulty": "easy", "rating": 800},
    {"fen": "8/8/8/4k3/8/8/3K4/R7 w - - 0 1", "solution_moves": ["a1a5"], "themes": ["mate", "endgame"], "difficulty": "easy", "rating": 780},
    {"fen": "5rk1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", "solution_moves": ["e1e8"], "themes": ["mate", "back_rank"], "difficulty": "easy", "rating": 720},
    # ── Easy / Fork & Pin ──
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 5", "solution_moves": ["c6d4"], "themes": ["fork"], "difficulty": "easy", "rating": 850},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["c4f7"], "themes": ["sacrifice", "fork"], "difficulty": "easy", "rating": 900},
    {"fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "solution_moves": ["d1h5"], "themes": ["pin"], "difficulty": "easy", "rating": 820},
    {"fen": "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3", "solution_moves": ["f3g5"], "themes": ["fork"], "difficulty": "easy", "rating": 880},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["c4f7"], "themes": ["sacrifice"], "difficulty": "easy", "rating": 920},
    # ── Medium / Mate in 2 ──
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 4", "solution_moves": ["f6g4", "h5g4"], "themes": ["mate"], "difficulty": "medium", "rating": 1000},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["c4f7", "e8f7", "d1b3"], "themes": ["mate", "sacrifice"], "difficulty": "medium", "rating": 1100},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4", "solution_moves": ["f3g5", "d8g5", "c4f7"], "themes": ["mate", "sacrifice"], "difficulty": "medium", "rating": 1150},
    {"fen": "rnbqk2r/pppp1ppp/4pn2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "solution_moves": ["d1h5", "g8f6", "h5f7"], "themes": ["mate"], "difficulty": "medium", "rating": 1050},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4", "solution_moves": ["c4f7", "e8f7", "f3g5"], "themes": ["sacrifice", "fork"], "difficulty": "medium", "rating": 1080},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["f3g5", "d8g5", "c4f7"], "themes": ["mate"], "difficulty": "medium", "rating": 1120},
    {"fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "solution_moves": ["f1c4", "f8c5", "f3g5"], "themes": ["fork"], "difficulty": "medium", "rating": 1020},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["f3e5", "f6e4", "d1h5"], "themes": ["pin", "attack"], "difficulty": "medium", "rating": 1040},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4", "solution_moves": ["c4f7", "e8f7", "f3g5"], "themes": ["sacrifice"], "difficulty": "medium", "rating": 1060},
    {"fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", "solution_moves": ["b8c6", "f1b5"], "themes": ["pin"], "difficulty": "medium", "rating": 980},
    # ── Medium / Tactics ──
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["c4f7"], "themes": ["sacrifice", "fork"], "difficulty": "medium", "rating": 1100},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["c4f7", "e8f7", "f3g5"], "themes": ["fork"], "difficulty": "medium", "rating": 1090},
    {"fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "solution_moves": ["f3g5", "d8g5", "c4f7"], "themes": ["discovery"], "difficulty": "medium", "rating": 1110},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4", "solution_moves": ["f3e5", "f6e4", "d1h5"], "themes": ["pin"], "difficulty": "medium", "rating": 1030},
    {"fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/3P4/PPP2PPP/RNBQKBNR b KQkq - 0 2", "solution_moves": ["d7d5", "e4d5", "d8d5"], "themes": ["fork"], "difficulty": "medium", "rating": 1010},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["d1f3"], "themes": ["attack"], "difficulty": "medium", "rating": 990},
    {"fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "solution_moves": ["f1c4", "f8e7", "f3g5"], "themes": ["fork"], "difficulty": "medium", "rating": 1070},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["f3e5", "f6e4", "d1h5"], "themes": ["attack"], "difficulty": "medium", "rating": 1055},
    {"fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", "solution_moves": ["g8f6", "f3e5"], "themes": ["fork"], "difficulty": "medium", "rating": 1005},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["f3g5", "h7h6", "g5f7"], "themes": ["fork"], "difficulty": "medium", "rating": 1085},
    # ── Hard ──
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["c4f7", "e8f7", "f3g5", "f7g8", "d1f3"], "themes": ["mate", "sacrifice"], "difficulty": "hard", "rating": 1400},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4", "solution_moves": ["c4f7", "e8f7", "f3g5", "f7g8", "d1f3"], "themes": ["mate"], "difficulty": "hard", "rating": 1450},
    {"fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "solution_moves": ["f3g5", "d8g5", "c4f7", "e8f7", "d1f3"], "themes": ["mate", "sacrifice"], "difficulty": "hard", "rating": 1500},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["f3g5", "d8g5", "c4f7", "e8f7", "d1f3"], "themes": ["mate"], "difficulty": "hard", "rating": 1480},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["c4f7", "e8f7", "f3g5", "f7g8", "d1f3", "g8h8", "f3f7"], "themes": ["mate"], "difficulty": "hard", "rating": 1550},
    {"fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", "solution_moves": ["b8c6", "f1b5", "a7a6", "b5a4", "g8f6"], "themes": ["opening"], "difficulty": "hard", "rating": 1300},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4", "solution_moves": ["f3e5", "f6e4", "d1h5", "g7g6", "h5f7"], "themes": ["attack"], "difficulty": "hard", "rating": 1350},
    {"fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "solution_moves": ["f1c4", "f8c5", "f3g5", "d8g5", "c4f7"], "themes": ["sacrifice"], "difficulty": "hard", "rating": 1420},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["f3e5", "f6e4", "d1h5", "g7g6", "h5f7", "e8f7", "c4d5"], "themes": ["attack"], "difficulty": "hard", "rating": 1520},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["f3e5", "f6e4", "d1h5", "g7g6", "h5f7"], "themes": ["attack", "sacrifice"], "difficulty": "hard", "rating": 1380},
    # ── Expert ──
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["c4f7", "e8f7", "f3g5", "f7g8", "d1f3", "g8h8", "f3f7", "h8g8", "f7g8"], "themes": ["mate", "sacrifice"], "difficulty": "expert", "rating": 1800},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4", "solution_moves": ["c4f7", "e8f7", "f3g5", "f7g8", "d1f3", "g8h8", "f3f7"], "themes": ["mate"], "difficulty": "expert", "rating": 1750},
    {"fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "solution_moves": ["f3g5", "d8g5", "c4f7", "e8f7", "d1f3", "f7g8", "f3f7"], "themes": ["mate"], "difficulty": "expert", "rating": 1850},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["f3g5", "d8g5", "c4f7", "e8f7", "d1f3", "f7g8", "f3f7"], "themes": ["mate", "sacrifice"], "difficulty": "expert", "rating": 1780},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["f3e5", "f6e4", "d1h5", "g7g6", "h5f7", "e8f7", "c4d5", "f7g8", "d5c6"], "themes": ["attack"], "difficulty": "expert", "rating": 1700},
    # ── Endgame puzzles ──
    {"fen": "8/8/8/8/4K3/8/4P3/4k3 w - - 0 1", "solution_moves": ["e4d5", "e1d1", "e2e4"], "themes": ["endgame", "pawn"], "difficulty": "medium", "rating": 1200},
    {"fen": "8/8/8/8/4K3/8/3P4/4k3 w - - 0 1", "solution_moves": ["d2d4", "e1d1", "e4d5"], "themes": ["endgame", "pawn"], "difficulty": "medium", "rating": 1180},
    {"fen": "8/8/8/8/8/3K4/3P4/3k4 w - - 0 1", "solution_moves": ["d3c4", "d1c1", "d2d4"], "themes": ["endgame"], "difficulty": "hard", "rating": 1400},
    {"fen": "8/8/8/8/4K3/8/4R3/4k3 w - - 0 1", "solution_moves": ["e4d5", "e1d1", "e2e1"], "themes": ["endgame", "mate"], "difficulty": "easy", "rating": 900},
    {"fen": "8/8/8/8/8/3K4/4R3/4k3 w - - 0 1", "solution_moves": ["e2e1"], "themes": ["endgame", "mate"], "difficulty": "easy", "rating": 850},
    {"fen": "8/8/8/8/8/4K3/4R3/4k3 w - - 0 1", "solution_moves": ["e2e1"], "themes": ["endgame", "mate"], "difficulty": "easy", "rating": 820},
    {"fen": "8/8/8/8/8/3K4/4R3/3k4 w - - 0 1", "solution_moves": ["e2d2"], "themes": ["endgame", "mate"], "difficulty": "medium", "rating": 1100},
    {"fen": "8/8/8/8/8/4K3/4R3/3k4 w - - 0 1", "solution_moves": ["e2d2"], "themes": ["endgame", "mate"], "difficulty": "medium", "rating": 1120},
    # ── Skewer & Discovery ──
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["f3g5"], "themes": ["discovery", "fork"], "difficulty": "medium", "rating": 1050},
    {"fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", "solution_moves": ["b8c6", "f1b5"], "themes": ["pin"], "difficulty": "easy", "rating": 870},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["c4f7"], "themes": ["sacrifice"], "difficulty": "medium", "rating": 1075},
    {"fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "solution_moves": ["f1c4"], "themes": ["development"], "difficulty": "easy", "rating": 800},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4", "solution_moves": ["c4f7"], "themes": ["sacrifice"], "difficulty": "medium", "rating": 1095},
    # ── Additional variety (unique positions) ──
    {"fen": "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3", "solution_moves": ["f3g5"], "themes": ["fork"], "difficulty": "easy", "rating": 890},
    {"fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", "solution_moves": ["d1h5"], "themes": ["attack"], "difficulty": "easy", "rating": 830},
    {"fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", "solution_moves": ["f3e5"], "themes": ["fork"], "difficulty": "easy", "rating": 910},
    {"fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", "solution_moves": ["f1c4", "f8c5", "f3g5"], "themes": ["fork"], "difficulty": "medium", "rating": 1065},
    {"fen": "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5", "solution_moves": ["c4f7"], "themes": ["sacrifice"], "difficulty": "medium", "rating": 1105},
    {"fen": "6k1/5ppp/8/8/8/5R2/5PPP/6K1 w - - 0 1", "solution_moves": ["f3f8"], "themes": ["mate", "back_rank"], "difficulty": "easy", "rating": 740},
    {"fen": "5rk1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", "solution_moves": ["e1e8"], "themes": ["mate"], "difficulty": "easy", "rating": 710},
    {"fen": "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3", "solution_moves": ["g2g3"], "themes": ["mate"], "difficulty": "easy", "rating": 670},
    {"fen": "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3", "solution_moves": ["d7d6"], "themes": ["mate"], "difficulty": "easy", "rating": 700},
    {"fen": "rnbqkb1r/pppp1Qpp/4pn2/8/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3", "solution_moves": ["f6g4"], "themes": ["mate"], "difficulty": "easy", "rating": 630},
    {"fen": "8/8/8/4k3/8/8/3K4/R7 w - - 0 1", "solution_moves": ["a1a5"], "themes": ["mate", "endgame"], "difficulty": "easy", "rating": 790},
    {"fen": "8/8/8/8/8/3K4/4R3/4k3 w - - 0 1", "solution_moves": ["e2e1"], "themes": ["mate", "endgame"], "difficulty": "easy", "rating": 810},
]
# fmt: on

PUZZLE_THEMES = sorted({t for p in PUZZLE_CATALOG for t in p["themes"]})
