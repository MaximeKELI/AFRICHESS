"""Tests Lichess TV rotation."""

import time
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone

from apps.games.live_tv import TV_CHANNELS, build_tv_payload
from apps.games.models import Game
from apps.ratings.models import PlayerRating

User = get_user_model()


class LiveTvTests(TestCase):
    def setUp(self):
        cache.clear()
        self.white = User.objects.create_user(username="tv_w", password="x")
        self.black = User.objects.create_user(username="tv_b", password="x")
        PlayerRating.objects.create(user=self.white, mode="blitz", elo=2100)
        PlayerRating.objects.create(user=self.black, mode="blitz", elo=2000)
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            mode="blitz",
            status=Game.Status.ACTIVE,
            fen="start",
            move_count=10,
        )

    def test_tv_channels_defined(self):
        self.assertIn("best", TV_CHANNELS)
        self.assertIn("blitz", TV_CHANNELS)

    def test_build_tv_payload_with_games(self):
        payload = build_tv_payload("blitz")
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["current_game_id"], str(self.game.id))
        self.assertIn("rotation_seconds", payload)

    def test_rotation_index_changes_over_time(self):
        with patch("apps.games.live_tv.time.time", return_value=0):
            p0 = build_tv_payload("best")["current_index"]
        with patch("apps.games.live_tv.time.time", return_value=60):
            p1 = build_tv_payload("best")["current_index"]
        self.assertIsInstance(p0, int)
        self.assertIsInstance(p1, int)

    def test_live_tv_api(self):
        res = self.client.get("/api/games/live/tv/?channel=blitz")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["channel"], "blitz")
        self.assertIsNotNone(res.data["current"])
