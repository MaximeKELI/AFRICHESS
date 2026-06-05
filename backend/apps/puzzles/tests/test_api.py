from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.puzzles.models import Puzzle

User = get_user_model()


class PuzzlesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="puz1", password="x")
        Puzzle.objects.create(
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            solution_moves=["e2e4"],
            difficulty="easy",
            is_daily=True,
        )

    def test_puzzle_list_public(self):
        res = self.client.get("/api/puzzles/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(res.data) >= 1)

    def test_daily_puzzle_public(self):
        res = self.client.get("/api/puzzles/daily/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("fen", res.data)

    def test_submit_requires_auth(self):
        puzzle = Puzzle.objects.first()
        res = self.client.post(
            f"/api/puzzles/{puzzle.pk}/submit/",
            {"moves": ["e2e4"], "time_seconds": 10},
            format="json",
        )
        self.assertEqual(res.status_code, 401)
