"""Tests variantes Phase 4 — Antichess, Horde, Racing Kings."""

from django.test import TestCase

from apps.games.variant_utils import (
    VARIANT_CHOICES,
    apply_move,
    board_from_fen,
    legal_moves_uci,
    starting_position_for_variant,
)


class Phase4VariantTests(TestCase):
    def test_variant_choices_include_phase4(self):
        for v in ("antichess", "horde", "racingkings"):
            self.assertIn(v, VARIANT_CHOICES)

    def test_starting_positions(self):
        for v in ("antichess", "horde", "racingkings"):
            fen, pos_id = starting_position_for_variant(v)
            self.assertIsNone(pos_id)
            self.assertTrue(len(fen) > 10)
            board = board_from_fen(fen, v)
            self.assertGreater(len(list(board.legal_moves)), 0)

    def test_antichess_first_move(self):
        fen, _ = starting_position_for_variant("antichess")
        moves = legal_moves_uci(fen, "antichess")
        self.assertGreater(len(moves), 0)
        result = apply_move(fen, moves[0], "antichess")
        self.assertIsNotNone(result)
        new_fen, san, is_over = result
        self.assertTrue(san)
        self.assertFalse(is_over)

    def test_racing_kings_legal_moves(self):
        fen, _ = starting_position_for_variant("racingkings")
        moves = legal_moves_uci(fen, "racingkings")
        self.assertGreater(len(moves), 0)

    def test_horde_white_has_extra_pawns(self):
        fen, _ = starting_position_for_variant("horde")
        self.assertIn("PPPPPPPP", fen)
