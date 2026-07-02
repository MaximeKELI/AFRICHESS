"""Tests deep review IA."""

from django.test import TestCase

from apps.games.deep_review_service import build_deep_review


class DeepReviewTests(TestCase):
    def test_turning_points_and_coaching_plan(self):
        moves = [
            {
                "san": "e4",
                "class": "best",
                "cp_loss": 5,
                "eval": 20,
                "played_by_white": True,
                "phase": "opening",
            },
            {
                "san": "Qh4",
                "class": "blunder",
                "cp_loss": 180,
                "eval": -160,
                "played_by_white": False,
                "phase": "opening",
                "best_san": "e5",
            },
        ]
        deep = build_deep_review(
            moves,
            accuracy_white=88.0,
            accuracy_black=62.0,
            depth=14,
        )
        self.assertEqual(deep["analysis_depth"], 14)
        self.assertTrue(deep["coaching_plan_fr"])
        self.assertTrue(deep["phase_report"]["opening"]["white_accuracy"] is not None)
        self.assertGreaterEqual(len(deep["turning_points"]), 1)
        self.assertTrue(any(m["class"] == "blunder" for m in deep["move_coaching"]))

    def test_integrity_crosscheck_divergence(self):
        moves = [
            {
                "san": "Nf3",
                "class": "best",
                "cp_loss": 8,
                "eval": 30,
                "played_by_white": True,
                "phase": "opening",
            },
        ]
        hints = {
            "verdict": "suspicious",
            "engine_top1_rate": 0.78,
            "analysis_accuracy": 55.0,
        }
        deep = build_deep_review(
            moves,
            accuracy_white=55.0,
            accuracy_black=70.0,
            depth=12,
            integrity_hints=hints,
        )
        codes = [f["code"] for f in deep["integrity_flags"]]
        self.assertIn("analysis_fairplay_divergence", codes)
