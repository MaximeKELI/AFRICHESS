from django.test import TestCase

from apps.puzzles.models import Puzzle
from apps.puzzles.random_sample import random_queryset


class RandomSampleTests(TestCase):
    def setUp(self):
        for i in range(5):
            Puzzle.objects.create(
                fen=f"fen{i}",
                solution_moves=["e2e4"],
                difficulty="medium",
            )

    def test_returns_requested_count(self):
        qs = random_queryset(Puzzle.objects.filter(difficulty="medium"), 3)
        self.assertEqual(qs.count(), 3)

    def test_empty_queryset(self):
        qs = random_queryset(Puzzle.objects.filter(difficulty="expert"), 5)
        self.assertEqual(qs.count(), 0)
