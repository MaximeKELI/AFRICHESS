"""Tests pour analysis_utils."""

from django.test import SimpleTestCase

from apps.games.analysis_utils import (
    compute_accuracies,
    compute_move_accuracies,
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
