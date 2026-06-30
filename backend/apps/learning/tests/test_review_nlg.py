"""Tests synthèse revue de partie."""

from django.test import SimpleTestCase

from apps.learning.review_nlg import generate_game_review


class ReviewNlgTests(SimpleTestCase):
    def test_empty_moves(self):
        summary_fr, summary_en, moments = generate_game_review([], accuracy_white=90, accuracy_black=88, blunders_white=0, blunders_black=0)
        self.assertIn("Aucun coup", summary_fr)
        self.assertIn("No moves", summary_en)
        self.assertEqual(moments, [])

    def test_blunder_detected(self):
        moves = [
            {"san": "e4", "class": "best", "played_by_white": True, "cp_loss": 0},
            {"san": "Qh4??", "class": "blunder", "played_by_white": True, "cp_loss": 400, "best_san": "Nf3"},
        ]
        summary_fr, summary_en, moments = generate_game_review(
            moves, accuracy_white=70, accuracy_black=80, blunders_white=1, blunders_black=0
        )
        self.assertIn("gaffe", summary_fr.lower())
        self.assertIn("blunder", summary_en.lower())
        self.assertGreaterEqual(len(moments), 1)
        self.assertTrue(any(m.get("class") == "blunder" for m in moments))
