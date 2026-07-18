"""Tests pour analysis_utils."""

from django.test import SimpleTestCase

from apps.games.analysis_utils import (
    compute_accuracies,
    compute_estimated_elos,
    compute_move_accuracies,
    estimate_elo_from_accuracy,
    move_accuracy_from_cp_loss,
)


class _Eval:
    def __init__(self, classification: str, centipawn_loss: int):
        self.classification = classification
        self.centipawn_loss = centipawn_loss


class AnalysisUtilsTests(SimpleTestCase):
    def test_move_accuracy_from_cp_loss_perfect(self):
        self.assertGreater(move_accuracy_from_cp_loss(0), 99.0)

    def test_move_accuracy_degrades(self):
        self.assertGreater(move_accuracy_from_cp_loss(10), move_accuracy_from_cp_loss(100))

    def test_compute_move_accuracies_by_color(self):
        evals = [
            _Eval("best", 0),
            _Eval("good", 30),
            _Eval("mistake", 120),
            _Eval("best", 5),
        ]
        rows = [("e2e4", True), ("g1f3", True), ("e7e5", False), ("b8c6", False)]
        class_acc_w, class_acc_b = compute_accuracies(evals, rows)
        move_acc_w, move_acc_b = compute_move_accuracies(evals, rows)
        self.assertIsNotNone(class_acc_w)
        self.assertIsNotNone(move_acc_b)
        self.assertIsNotNone(move_acc_w)
        self.assertIsNotNone(move_acc_b)
        self.assertGreater(move_acc_w, move_acc_b)


class EstimatedEloTests(SimpleTestCase):
    def test_none_accuracy_returns_none(self):
        self.assertIsNone(estimate_elo_from_accuracy(None, 20))

    def test_too_few_moves_returns_none(self):
        self.assertIsNone(estimate_elo_from_accuracy(90.0, 3))

    def test_monotonic_with_accuracy(self):
        low = estimate_elo_from_accuracy(55.0, 30)
        mid = estimate_elo_from_accuracy(75.0, 30)
        high = estimate_elo_from_accuracy(95.0, 30)
        self.assertIsNotNone(low)
        self.assertIsNotNone(mid)
        self.assertIsNotNone(high)
        self.assertLess(low, mid)
        self.assertLess(mid, high)

    def test_ranges_are_reasonable(self):
        # ~95 % ≈ niveau maître ; ~60 % ≈ niveau intermédiaire faible.
        strong = estimate_elo_from_accuracy(95.0, 40)
        weak = estimate_elo_from_accuracy(60.0, 40)
        self.assertGreater(strong, 2200)
        self.assertLess(weak, 1200)
        self.assertGreaterEqual(weak, 100)

    def test_bounds_clamped(self):
        self.assertGreaterEqual(estimate_elo_from_accuracy(0.0, 20), 100)
        self.assertLessEqual(estimate_elo_from_accuracy(100.0, 20), 3000)

    def test_compute_estimated_elos_by_color(self):
        rows = [("e2e4", True)] * 10 + [("e7e5", False)] * 10
        est_w, est_b = compute_estimated_elos(92.0, 61.0, rows)
        self.assertIsNotNone(est_w)
        self.assertIsNotNone(est_b)
        self.assertGreater(est_w, est_b)

    def test_compute_estimated_elos_short_game_none(self):
        rows = [("e2e4", True), ("e7e5", False)]
        est_w, est_b = compute_estimated_elos(92.0, 61.0, rows)
        self.assertIsNone(est_w)
        self.assertIsNone(est_b)
