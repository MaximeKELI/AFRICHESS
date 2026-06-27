"""Tests explications de coups."""

from django.test import SimpleTestCase

from apps.learning.move_explain import explain_move_detail


class MoveExplainTests(SimpleTestCase):
    def test_blunder_includes_best_move(self):
        text = explain_move_detail("blunder", "Qh4", 350, best_san="Nf3", pv_san="Nf3 Nc6")
        self.assertIn("Qh4", text)
        self.assertIn("Nf3", text)
        self.assertIn("gaffe", text)

    def test_best_move(self):
        text = explain_move_detail("best", "Nf3", 0)
        self.assertIn("Nf3", text)
        self.assertIn("meilleur", text)
