"""Tests approfondis Section 1 — Rush / Storm / Survival / Battle (parité Lichess)."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.puzzles.models import Puzzle, PuzzleBattle, PuzzleRushSession
from apps.puzzles.rush_battle import (
    battle_puzzle_for_user,
    battle_submit,
    join_battle_queue,
    rush_submit,
    start_rush_session,
    survival_submit,
    start_survival_session,
)
from apps.puzzles.storm import start_storm_session, storm_submit
from apps.puzzles.submit_service import process_puzzle_submission

User = get_user_model()


def _puzzle(uci: str = "e2e4", rating: int = 1200, **kwargs) -> Puzzle:
    return Puzzle.objects.create(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solution_moves=[uci],
        difficulty="easy",
        rating=rating,
        **kwargs,
    )


class RushMissAdvancesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="rush_adv", password="x")
        self.p1 = _puzzle("e2e4")
        self.p2 = _puzzle("d2d4")
        self.p3 = _puzzle("c2c4")
        self.p4 = _puzzle("b2b4")

    def _session(self, ids=None):
        return PuzzleRushSession.objects.create(
            user=self.user,
            mode=PuzzleRushSession.Mode.RUSH,
            puzzle_ids=ids or [self.p1.id, self.p2.id, self.p3.id, self.p4.id],
            ends_at=timezone.now() + timedelta(minutes=3),
        )

    def test_miss_advances_to_different_puzzle(self):
        session = self._session()
        first_id = session.puzzle_ids[0]
        result = rush_submit(session, ["a2a3"])
        session.refresh_from_db()
        self.assertFalse(result["solved"])
        self.assertEqual(session.misses, 1)
        self.assertEqual(session.current_index, 1)
        self.assertEqual(result["next_puzzle_id"], self.p2.id)
        self.assertNotEqual(result["next_puzzle_id"], first_id)

    def test_rush_ends_after_three_misses(self):
        session = self._session()
        rush_submit(session, ["a2a3"])
        rush_submit(session, ["a2a3"])
        result = rush_submit(session, ["a2a3"])
        session.refresh_from_db()
        self.assertTrue(result["completed"])
        self.assertEqual(result["reason"], "misses")
        self.assertEqual(session.misses, 3)
        self.assertEqual(session.status, PuzzleRushSession.Status.COMPLETED)

    def test_correct_increments_score_and_advances(self):
        session = self._session()
        result = rush_submit(session, ["e2e4"])
        self.assertTrue(result["solved"])
        self.assertEqual(result["score"], 1)
        self.assertEqual(result["next_puzzle_id"], self.p2.id)

    def test_promotion_shorthand_accepted(self):
        promo = Puzzle.objects.create(
            fen="8/4P3/8/8/8/8/8/4K2k w - - 0 1",
            solution_moves=["e7e8q"],
            difficulty="easy",
            rating=900,
        )
        session = self._session([promo.id, self.p2.id])
        result = rush_submit(session, ["e7e8"])
        self.assertTrue(result["solved"])

    def test_timeout_completes_session(self):
        session = self._session()
        session.ends_at = timezone.now() - timedelta(seconds=1)
        session.save(update_fields=["ends_at"])
        result = rush_submit(session, ["e2e4"])
        self.assertTrue(result["completed"])
        self.assertEqual(result["reason"], "timeout")


class StormParityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="storm_u", password="x")
        for i in range(40):
            _puzzle(f"e2e4", rating=900 + i * 30)

    def test_storm_unlimited_misses_still_active(self):
        session = start_storm_session(self.user)
        # 5 erreurs — ne doit PAS terminer (contrairement à Rush)
        for _ in range(5):
            result = storm_submit(session, ["a2a3"])
            session.refresh_from_db()
            if result.get("completed") and result.get("reason") == "timeout":
                break
            self.assertFalse(result.get("completed"), msg=result)
            self.assertIsNotNone(result.get("next_puzzle_id"))
        self.assertEqual(session.mode, PuzzleRushSession.Mode.STORM)
        self.assertGreaterEqual(session.misses, 5)
        self.assertEqual(session.status, PuzzleRushSession.Status.ACTIVE)

    def test_storm_score_only_on_solve(self):
        session = start_storm_session(self.user)
        puzzle = Puzzle.objects.get(pk=session.puzzle_ids[0])
        storm_submit(session, ["a2a3"])
        session.refresh_from_db()
        self.assertEqual(session.score, 0)
        result = storm_submit(session, puzzle.solution_moves)
        # Après miss, index a avancé — solution du 1er ne matche plus le 2e
        # On résout le puzzle courant
        session.refresh_from_db()
        current = Puzzle.objects.get(pk=session.puzzle_ids[session.current_index])
        result = storm_submit(session, current.solution_moves)
        self.assertTrue(result["solved"])
        self.assertEqual(result["score"], 1)


class SurvivalTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="surv_u", password="x")
        self.puzzles = [_puzzle("e2e4"), _puzzle("d2d4"), _puzzle("c2c4")]

    def test_one_miss_eliminates(self):
        session = start_survival_session(self.user)
        session.puzzle_ids = [p.id for p in self.puzzles]
        session.current_index = 0
        session.save()
        result = survival_submit(session, ["a2a3"])
        self.assertTrue(result["completed"])
        self.assertFalse(result["solved"])
        self.assertEqual(result["misses"], 1)


class BattleIndependentIndexTests(TestCase):
    def setUp(self):
        self.u1 = User.objects.create_user(username="b1", password="x")
        self.u2 = User.objects.create_user(username="b2", password="x")
        self.puzzles = [_puzzle("e2e4"), _puzzle("d2d4"), _puzzle("c2c4")]

    def _active_battle(self) -> PuzzleBattle:
        return PuzzleBattle.objects.create(
            player1=self.u1,
            player2=self.u2,
            puzzle_ids=[p.id for p in self.puzzles],
            status=PuzzleBattle.Status.ACTIVE,
            index1=0,
            index2=0,
        )

    def test_players_progress_independently(self):
        battle = self._active_battle()
        # P1 résout puzzle 0
        r1 = battle_submit(battle, self.u1, ["e2e4"])
        battle.refresh_from_db()
        self.assertTrue(r1["solved"])
        self.assertEqual(battle.index1, 1)
        self.assertEqual(battle.index2, 0)
        self.assertEqual(battle.score1, 1)

        # P2 est toujours sur puzzle 0 — peut encore le résoudre
        r2 = battle_submit(battle, self.u2, ["e2e4"])
        battle.refresh_from_db()
        self.assertTrue(r2["solved"])
        self.assertEqual(battle.index2, 1)
        self.assertEqual(battle.score2, 1)

        # Puzzles courants différents si indices divergent
        battle.index1 = 2
        battle.index2 = 0
        battle.save()
        p_for_1 = battle_puzzle_for_user(battle, self.u1)
        p_for_2 = battle_puzzle_for_user(battle, self.u2)
        self.assertEqual(p_for_1.id, self.puzzles[2].id)
        self.assertEqual(p_for_2.id, self.puzzles[0].id)

    def test_miss_advances_without_score(self):
        battle = self._active_battle()
        result = battle_submit(battle, self.u1, ["a2a3"])
        battle.refresh_from_db()
        self.assertFalse(result["solved"])
        self.assertEqual(battle.index1, 1)
        self.assertEqual(battle.score1, 0)
        self.assertIsNotNone(result.get("next_puzzle_id"))

    def test_battle_completes_when_both_finished(self):
        battle = self._active_battle()
        # 3 puzzles chacun
        for _ in range(3):
            battle_submit(battle, self.u1, ["e2e4"])  # may or may not match current
            battle.refresh_from_db()
        # Force finish properly
        battle = self._active_battle()
        for p in self.puzzles:
            battle_submit(battle, self.u1, p.solution_moves)
            battle.refresh_from_db()
        self.assertEqual(battle.index1, 3)
        self.assertFalse(battle.status == PuzzleBattle.Status.COMPLETED)
        for p in self.puzzles:
            battle_submit(battle, self.u2, p.solution_moves)
            battle.refresh_from_db()
        self.assertEqual(battle.status, PuzzleBattle.Status.COMPLETED)
        self.assertEqual(battle.winner_id, self.u1.id)

    def test_queue_match_resets_indexes(self):
        for _ in range(10):
            _puzzle("e2e4")
        waiting = join_battle_queue(self.u1)
        matched = join_battle_queue(self.u2)
        self.assertEqual(matched.id, waiting.id)
        self.assertEqual(matched.index1, 0)
        self.assertEqual(matched.index2, 0)


class SubmitServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="sub_u", password="x")
        self.puzzle = Puzzle.objects.create(
            fen="8/4P3/8/8/8/8/8/4K2k w - - 0 1",
            solution_moves=["e7e8q"],
            difficulty="easy",
            rating=1000,
        )

    def test_promotion_shorthand_counts_solved(self):
        result = process_puzzle_submission(self.user, self.puzzle, ["e7e8"], 5)
        self.assertTrue(result["solved"])
        self.assertEqual(result["correct_moves"], ["e7e8q"])

    def test_fail_still_returns_solution(self):
        result = process_puzzle_submission(self.user, self.puzzle, ["e7e8r"], 5)
        self.assertFalse(result["solved"])
        self.assertEqual(result["correct_moves"], ["e7e8q"])

    def test_success_rate_updates(self):
        process_puzzle_submission(self.user, self.puzzle, ["e7e8"], 3)
        self.puzzle.refresh_from_db()
        self.assertEqual(self.puzzle.plays_count, 1)
        self.assertAlmostEqual(self.puzzle.success_rate, 1.0)
        process_puzzle_submission(self.user, self.puzzle, ["a2a3"], 3)
        self.puzzle.refresh_from_db()
        self.assertEqual(self.puzzle.plays_count, 2)
        self.assertAlmostEqual(self.puzzle.success_rate, 0.5)


class LeaderboardModeFilterApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.u = User.objects.create_user(username="lb_u", password="x")
        PuzzleRushSession.objects.create(
            user=self.u,
            mode=PuzzleRushSession.Mode.RUSH,
            puzzle_ids=[],
            score=10,
            status=PuzzleRushSession.Status.COMPLETED,
            ends_at=timezone.now(),
        )
        PuzzleRushSession.objects.create(
            user=self.u,
            mode=PuzzleRushSession.Mode.STORM,
            puzzle_ids=[],
            score=99,
            status=PuzzleRushSession.Status.COMPLETED,
            ends_at=timezone.now(),
        )

    def test_rush_leaderboard_excludes_storm(self):
        res = self.client.get("/api/puzzles/rush/leaderboard/?mode=rush")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data[0]["score"], 10)
        self.assertEqual(res.data[0]["mode"], "rush")

    def test_storm_leaderboard_isolated(self):
        res = self.client.get("/api/puzzles/rush/leaderboard/?mode=storm")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data[0]["score"], 99)
        self.assertEqual(res.data[0]["mode"], "storm")


class StormApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="storm_api", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        for i in range(25):
            _puzzle("e2e4", rating=1000 + i * 20)

    def test_storm_start_and_miss_returns_next(self):
        start = self.client.post("/api/puzzles/storm/start/", {}, format="json")
        self.assertEqual(start.status_code, 201)
        sid = start.data["session_id"]
        first_id = start.data["puzzle"]["id"]
        sub = self.client.post(
            f"/api/puzzles/storm/{sid}/submit/",
            {"moves": ["a2a3"], "time_seconds": 1},
            format="json",
        )
        self.assertEqual(sub.status_code, 200)
        self.assertFalse(sub.data["solved"])
        self.assertFalse(sub.data.get("completed"))
        self.assertIn("next_puzzle", sub.data)
        self.assertNotEqual(sub.data["next_puzzle"]["id"], first_id)
