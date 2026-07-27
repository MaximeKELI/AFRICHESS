"""Tests des briques de la revue de partie : phases, ouverture, sérialisation."""

from django.test import SimpleTestCase

from apps.games.review_phases import build_analyzed_moves_json, fen_after_moves, infer_phase
from apps.games.stats_service import opening_from_moves


class _Eval:
    def __init__(self, uci, san, cp_loss=0, cls="best"):
        self.uci = uci
        self.san = san
        self.eval_after = 0.1
        self.eval_before = 0.0
        self.classification = cls
        self.centipawn_loss = cp_loss
        self.best_uci = uci
        self.best_san = san
        self.pv_san = san


class InferPhaseTests(SimpleTestCase):
    def test_early_moves_are_opening(self):
        self.assertEqual(infer_phase(0), "opening")
        self.assertEqual(infer_phase(5), "opening")

    def test_late_move_number_is_endgame(self):
        # ply 70 -> coup 35 -> finale
        self.assertEqual(infer_phase(70), "endgame")

    def test_few_pieces_is_endgame(self):
        endgame_fen = "8/8/4k3/8/8/4K3/8/8 w - - 0 60"
        self.assertEqual(infer_phase(30, endgame_fen), "endgame")

    def test_middlegame_default(self):
        # coup ~20, beaucoup de pièces -> milieu de jeu
        full_fen = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3"
        self.assertEqual(infer_phase(24, full_fen), "middlegame")


class BuildAnalyzedMovesJsonTests(SimpleTestCase):
    def test_rows_carry_phase_and_color(self):
        evals = [
            _Eval("e2e4", "e4"),
            _Eval("e7e5", "e5"),
            _Eval("g1f3", "Nf3"),
        ]
        move_rows = [("e2e4", True), ("e7e5", False), ("g1f3", True)]
        rows = build_analyzed_moves_json(evals, move_rows)
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0]["phase"], "opening")
        self.assertTrue(rows[0]["played_by_white"])
        self.assertFalse(rows[1]["played_by_white"])
        self.assertIn("cp_loss", rows[0])

    def test_fen_after_moves_advances_position(self):
        fen = fen_after_moves(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            ["e2e4", "e7e5"],
        )
        self.assertIn("4p3", fen)


class OpeningFromMovesTests(SimpleTestCase):
    def test_bird_opening_named(self):
        self.assertIn("oiseau", opening_from_moves(["f4"]).lower())

    def test_sicilian_named(self):
        name = opening_from_moves(["e4", "c5"]).lower()
        self.assertIn("sicil", name)
        self.assertIn("pion roi", name)

    def test_queens_gambit_named(self):
        name = opening_from_moves(["d4", "d5", "c4"]).lower()
        self.assertIn("gambit", name)

    def test_empty_is_start_position(self):
        self.assertEqual(opening_from_moves([]), "Position initiale")


class GameAnalysisSerializerFieldsTests(SimpleTestCase):
    def test_serializer_exposes_est_elo_and_phase_fields(self):
        from apps.games.serializers import GameAnalysisSerializer

        fields = set(GameAnalysisSerializer.Meta.fields)
        self.assertIn("est_elo_white", fields)
        self.assertIn("est_elo_black", fields)
        self.assertIn("move_accuracy_white", fields)
        self.assertIn("best_moves_json", fields)
