"""Tests UCI — normalisation et égalité souple (promo dame)."""

from django.test import SimpleTestCase

from apps.puzzles.uci import moves_match_solution, normalize_uci, uci_equals


class UciNormalizeTests(SimpleTestCase):
    def test_normalize_lower_strip(self):
        self.assertEqual(normalize_uci(" E2E4 "), "e2e4")

    def test_uci_equals_promotion_shorthand(self):
        self.assertTrue(uci_equals("e7e8", "e7e8q"))
        self.assertTrue(uci_equals("e7e8q", "e7e8"))
        self.assertFalse(uci_equals("e7e8r", "e7e8q"))

    def test_moves_match_solution_tolerant(self):
        self.assertTrue(moves_match_solution(["E7E8"], ["e7e8q"]))
        self.assertFalse(moves_match_solution(["e2e4"], ["e2e4", "e7e5"]))
        self.assertFalse(moves_match_solution(["e2e4", "e7e5"], ["e2e4"]))
