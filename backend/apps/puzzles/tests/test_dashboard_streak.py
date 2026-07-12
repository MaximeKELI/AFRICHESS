"""Tests dashboard + Puzzle Streak (mode Lichess)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.puzzles.models import Puzzle, PuzzleAttempt, PuzzleRushSession
from apps.puzzles.rush_battle import start_streak_session, streak_submit

User = get_user_model()


def _make_puzzle(idx: int = 0, rating: int = 900) -> Puzzle:
    return Puzzle.objects.create(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solution_moves=[f"e2e{4 + (idx % 4)}"],
        difficulty="easy",
        rating=rating,
        themes=["fork"] if idx % 2 == 0 else ["mate"],
    )


class PuzzleDashboardApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="dash_u", password="x")
        self.client = APIClient()
        self.other = User.objects.create_user(username="dash_other", password="x")
        p = _make_puzzle(0)
        PuzzleAttempt.objects.create(
            user=self.user,
            puzzle=p,
            solved=True,
            moves_played=p.solution_moves,
            time_seconds=5,
        )
        PuzzleAttempt.objects.create(
            user=self.user,
            puzzle=_make_puzzle(1),
            solved=False,
            moves_played=["a2a3"],
            time_seconds=3,
        )

    def test_dashboard_requires_auth(self):
        res = self.client.get("/api/puzzles/dashboard/")
        self.assertEqual(res.status_code, 401)

    def test_dashboard_fields(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/puzzles/dashboard/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("puzzle_elo", res.data)
        self.assertIn("daily_streak", res.data)
        self.assertIn("solved_count", res.data)
        self.assertIn("last_30_days", res.data)
        self.assertEqual(res.data["solved_count"], 1)
        self.assertEqual(res.data["last_30_days"]["solved"], 1)
        self.assertEqual(res.data["last_30_days"]["failed"], 1)
        self.assertEqual(len(res.data["recent_attempts"]), 2)


class PuzzleStreakRunTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="streak_u", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        for i in range(15):
            _make_puzzle(i, rating=800 + i * 40)

    def test_start_submit_skip_fail(self):
        session = start_streak_session(self.user)
        self.assertEqual(session.mode, PuzzleRushSession.Mode.STREAK)
        self.assertTrue(session.puzzle_ids)

        puzzle = Puzzle.objects.get(pk=session.puzzle_ids[0])
        ok = streak_submit(session, puzzle.solution_moves)
        self.assertTrue(ok["solved"])
        self.assertEqual(ok["score"], 1)
        self.assertFalse(ok["completed"])
        self.assertIsNotNone(ok["next_puzzle_id"])

        session.refresh_from_db()
        skipped = streak_submit(session, [], skip=True)
        self.assertTrue(skipped.get("skipped"))
        self.assertTrue(skipped["skip_used"])
        self.assertFalse(skipped["completed"])

        session.refresh_from_db()
        twice = streak_submit(session, [], skip=True)
        self.assertIn("error", twice)

        session.refresh_from_db()
        cur = Puzzle.objects.get(pk=session.puzzle_ids[session.current_index])
        fail = streak_submit(session, ["a2a4"])
        self.assertFalse(fail["solved"])
        self.assertTrue(fail["completed"])
        self.assertEqual(fail["score"], 1)

    def test_streak_run_api(self):
        res = self.client.post("/api/puzzles/streak-run/start/", {}, format="json")
        self.assertEqual(res.status_code, 201)
        sid = res.data["session_id"]
        puzzle = res.data["puzzle"]
        self.assertIsNotNone(puzzle)

        res2 = self.client.post(
            f"/api/puzzles/streak-run/{sid}/submit/",
            {"moves": puzzle["solution_moves"], "time_seconds": 1},
            format="json",
        )
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.data["solved"])

        res3 = self.client.post(
            f"/api/puzzles/streak-run/{sid}/submit/",
            {"skip": True},
            format="json",
        )
        self.assertEqual(res3.status_code, 200)
        self.assertTrue(res3.data.get("skip_used"))


class PuzzleThemesApiTests(TestCase):
    def setUp(self):
        _make_puzzle(0)
        _make_puzzle(1)

    def test_themes_list(self):
        client = APIClient()
        res = client.get("/api/puzzles/themes/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("themes", res.data)
        self.assertTrue(len(res.data["themes"]) >= 1)

    def test_training_theme_filter(self):
        client = APIClient()
        res = client.get("/api/puzzles/training/", {"difficulty": "easy", "theme": "fork"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(isinstance(res.data, list))
