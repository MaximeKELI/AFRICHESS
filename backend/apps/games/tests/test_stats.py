"""Tests statistiques de parties."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.models import Game
from apps.games.stats_service import build_user_stats_payload, on_game_completed, record_game_stats
from apps.users.models import UserStats

User = get_user_model()


class RecordGameStatsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="stats_user",
            email="stats@test.com",
            password="pass",
        )
        UserStats.objects.create(user=self.user)

    def test_win_updates_counters(self):
        game = Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            mode=Game.Mode.AI,
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
            winner=self.user,
            ended_at=timezone.now(),
            started_at=timezone.now(),
        )
        record_game_stats(game)
        self.user.stats.refresh_from_db()
        self.assertEqual(self.user.stats.games_played, 1)
        self.assertEqual(self.user.stats.games_won, 1)
        self.assertEqual(self.user.stats.current_streak, 1)
        game.refresh_from_db()
        self.assertTrue(game.stats_recorded)

    def test_idempotent(self):
        game = Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            mode=Game.Mode.AI,
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
            winner=self.user,
            ended_at=timezone.now(),
        )
        record_game_stats(game)
        record_game_stats(game)
        self.user.stats.refresh_from_db()
        self.assertEqual(self.user.stats.games_played, 1)


class StatsAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="api_stats",
            email="apistats@test.com",
            password="pass",
        )
        UserStats.objects.create(user=self.user, games_played=2, games_won=1)
        Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            mode=Game.Mode.AI,
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
            ai_target_elo=1250,
            ended_at=timezone.now(),
            stats_recorded=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_my_stats_endpoint(self):
        res = self.client.get("/api/stats/me/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("summary", res.data)
        self.assertIn("by_mode", res.data)
        self.assertIn("openings", res.data)
        self.assertIn("recent_form", res.data)
        self.assertEqual(res.data["vs_opponent"]["ai"]["played"], 1)

    def test_build_payload_has_activity(self):
        payload = build_user_stats_payload(self.user)
        self.assertEqual(len(payload["activity"]), 30)
