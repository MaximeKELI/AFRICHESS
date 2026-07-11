"""Tests Puzzle Rush et Puzzle Battle — logique + API."""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.puzzles.models import Puzzle, PuzzleRushSession
from apps.puzzles.rush_battle import join_battle_queue, rush_submit, start_rush_session

User = get_user_model()


def _make_puzzle(idx: int = 0) -> Puzzle:
    return Puzzle.objects.create(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solution_moves=[f"e2e{4 + idx}"],
        difficulty="easy",
    )


class PuzzleRushLogicTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="rush_u", password="x")
        self.puzzles = [_make_puzzle(i) for i in range(5)]

    def test_start_rush_session(self):
        session = start_rush_session(self.user)
        self.assertEqual(session.user, self.user)
        self.assertGreater(len(session.puzzle_ids), 0)

    def test_rush_submit_correct_move(self):
        session = start_rush_session(self.user)
        puzzle = Puzzle.objects.get(pk=session.puzzle_ids[0])
        result = rush_submit(session, puzzle.solution_moves)
        self.assertTrue(result["solved"])
        self.assertEqual(result["score"], 1)

    def test_battle_queue_creates_waiting_battle(self):
        battle = join_battle_queue(self.user)
        self.assertIsNotNone(battle)
        assert battle is not None
        self.assertEqual(battle.player1, self.user)
        self.assertEqual(battle.status, "waiting")

    def test_battle_queue_match_reuses_waiting_battle(self):
        """Le 2e joueur active le combat WAITING du 1er (même id)."""
        other = User.objects.create_user(username="rush_opp", password="x")
        waiting = join_battle_queue(self.user)
        self.assertEqual(waiting.status, "waiting")
        matched = join_battle_queue(other)
        self.assertEqual(matched.id, waiting.id)
        self.assertEqual(matched.status, "active")
        self.assertEqual(matched.player1_id, self.user.id)
        self.assertEqual(matched.player2_id, other.id)


class PuzzleRushApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="rush_api", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        for i in range(20):
            _make_puzzle(i)

    @patch("apps.users.premium_utils.record_puzzle_rush_start")
    @patch("apps.users.premium_utils.can_start_puzzle_rush", return_value=(True, None))
    def test_rush_session_start(self, _can, _record):
        res = self.client.post("/api/puzzles/rush/start/", {}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("session_id", res.data)

    def test_battle_queue_join(self):
        res = self.client.post("/api/puzzles/battle/queue/", {}, format="json")
        self.assertIn(res.status_code, (201, 202))
        self.assertIn("battle_id", res.data)

    def test_rush_submit_endpoint(self):
        session = PuzzleRushSession.objects.create(
            user=self.user,
            puzzle_ids=[Puzzle.objects.first().pk],
            ends_at=timezone.now() + timezone.timedelta(minutes=3),
        )
        puzzle = Puzzle.objects.get(pk=session.puzzle_ids[0])
        res = self.client.post(
            f"/api/puzzles/rush/{session.id}/submit/",
            {"moves": puzzle.solution_moves},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["solved"])
