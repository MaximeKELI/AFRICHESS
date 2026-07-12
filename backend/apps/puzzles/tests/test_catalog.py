"""Garantit que le catalogue seed ne contient que des positions légales."""

from django.test import SimpleTestCase

import chess

from apps.puzzles.puzzle_catalog import PUZZLE_CATALOG


class PuzzleCatalogValidityTests(SimpleTestCase):
    def test_all_catalog_solutions_are_legal(self):
        self.assertGreaterEqual(len(PUZZLE_CATALOG), 40)
        for i, data in enumerate(PUZZLE_CATALOG):
            board = chess.Board(data["fen"])
            for uci in data["solution_moves"]:
                move = chess.Move.from_uci(uci)
                self.assertIn(
                    move,
                    board.legal_moves,
                    msg=f"#{i} rating={data.get('rating')} illegal {uci} in {data['fen']}",
                )
                board.push(move)

    def test_difficulty_coverage(self):
        levels = {p["difficulty"] for p in PUZZLE_CATALOG}
        self.assertTrue({"easy", "medium", "hard", "expert"} <= levels)
