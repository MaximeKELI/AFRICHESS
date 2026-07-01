"""Tests file matchmaking Redis."""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.games.matchmaking_redis import (
    pool_key,
    reset_availability_cache,
)
from apps.games.models import Game, MatchmakingQueue
from apps.games.services import MatchmakingService

User = get_user_model()


class MatchmakingPoolKeyTests(TestCase):
    def test_pool_key_encodes_cadence(self):
        key = pool_key(
            mode="blitz",
            variant="standard",
            is_timed=True,
            is_rated=True,
            time_control="3+2",
            time_control_minutes=3,
        )
        self.assertIn("blitz", key)
        self.assertIn("3+2", key)


@override_settings(MATCHMAKING_REDIS_ENABLED=False)
class MatchmakingPgFallbackTests(TestCase):
    """Sans Redis, le comportement PostgreSQL existant est conservé."""

    def setUp(self):
        reset_availability_cache()
        self.svc = MatchmakingService()
        self.a = User.objects.create_user(username="redis_a", password="x")
        self.b = User.objects.create_user(username="redis_b", password="x")

    def test_search_pairs_two_players_pg(self):
        self.svc.join_queue(self.a, "blitz", 1200, is_rated=False, time_control="3+2")
        game = self.svc.search(
            self.b,
            "blitz",
            1250,
            is_rated=False,
            is_timed=True,
            time_control="3+2",
        )
        self.assertIsNotNone(game)
        self.assertEqual(MatchmakingQueue.objects.count(), 0)
        self.assertEqual(Game.objects.filter(is_vs_ai=False).count(), 1)


class MatchmakingRedisIntegrationTests(TestCase):
    """Exécutés si Redis local répond."""

    def setUp(self):
        reset_availability_cache()
        from apps.games import matchmaking_redis as mmr

        if not mmr.is_redis_matchmaking_available():
            self.skipTest("Redis unavailable")
        self.svc = MatchmakingService()
        self.a = User.objects.create_user(username="mm_redis_a", password="x")
        self.b = User.objects.create_user(username="mm_redis_b", password="x")

    def tearDown(self):
        self.svc.leave_queue(self.a)
        self.svc.leave_queue(self.b)
        reset_availability_cache()

    def test_redis_instant_pair(self):
        self.svc.search(
            self.a,
            "blitz",
            1200,
            is_rated=False,
            is_timed=True,
            time_control="3+2",
        )
        game = self.svc.search(
            self.b,
            "blitz",
            1250,
            is_rated=False,
            is_timed=True,
            time_control="3+2",
        )
        self.assertIsNotNone(game)
        self.assertEqual(MatchmakingQueue.objects.count(), 0)

    @patch("apps.games.services.MatchmakingService._notify_match")
    def test_searching_count(self, _mock_notify):
        from apps.games import matchmaking_redis as mmr

        self.svc.search(
            self.a,
            "rapid",
            1400,
            is_rated=False,
            is_timed=True,
            time_control="10+0",
        )
        self.assertGreaterEqual(self.svc.searching_count(), 1)
        self.svc.leave_queue(self.a)
        self.assertGreaterEqual(mmr.searching_count(), 0)
