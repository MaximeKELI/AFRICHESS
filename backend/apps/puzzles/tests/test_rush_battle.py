"""Tests Puzzle Rush et Puzzle Battle."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.puzzles.models import Puzzle, PuzzleRushSession

User = get_user_model()


class PuzzleRushBattleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="rush_u", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        Puzzle.objects.create(
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            moves_uci=["e2e4"],
            rating=1200,
        )

    def test_rush_session_start(self):
        res = self.client.post("/api/puzzles/rush/start/", {}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("session_id", res.data)

    def test_rush_session_finish(self):
        session = PuzzleRushSession.objects.create(user=self.user)
        res = self.client.post(
            f"/api/puzzles/rush/{session.id}/finish/",
            {"score": 5, "puzzles_solved": 3},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        session.refresh_from_db()
        self.assertEqual(session.score, 5)

    def test_battle_queue_join(self):
        res = self.client.post("/api/puzzles/battle/join/", {}, format="json")
        self.assertIn(res.status_code, (200, 201, 202))
