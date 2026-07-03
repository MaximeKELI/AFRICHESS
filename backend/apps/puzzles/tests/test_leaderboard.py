from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.puzzles.models import Puzzle, PuzzleAttempt

User = get_user_model()


class PuzzleLeaderboardTests(TestCase):
    def setUp(self):
        self.u1 = User.objects.create_user(username="lb_u1", password="x")
        self.u2 = User.objects.create_user(username="lb_u2", password="x")
        self.puzzle = Puzzle.objects.create(
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            solution_moves=["e2e4"],
            difficulty=Puzzle.Difficulty.MEDIUM,
            rating=1200,
        )
        PuzzleAttempt.objects.create(user=self.u1, puzzle=self.puzzle, solved=True)
        PuzzleAttempt.objects.create(user=self.u1, puzzle=self.puzzle, solved=True)
        PuzzleAttempt.objects.create(user=self.u2, puzzle=self.puzzle, solved=True)
        self.client = APIClient()

    def test_leaderboard_returns_200_with_display_names(self):
        res = self.client.get("/api/puzzles/leaderboard/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertGreaterEqual(len(res.data), 2)
        first = res.data[0]
        self.assertEqual(first["username"], "lb_u1")
        self.assertEqual(first["solved_count"], 2)
        self.assertIn("display_name", first)
