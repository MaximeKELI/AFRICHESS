"""Tests TV exhibition IA + filtre parties fantômes."""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.game_actions import live_games_queryset
from apps.games.models import Game
from apps.games.tv_exhibition import (
    create_exhibition_game,
    ensure_tv_exhibitions,
    play_exhibition_move,
)

User = get_user_model()


class LiveTvFilterTests(TestCase):
    def setUp(self):
        cache.clear()
        self.w = User.objects.create_user(username="hum_w", password="x")
        self.b = User.objects.create_user(username="hum_b", password="x")

    def test_zero_move_games_excluded(self):
        Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            mode="blitz",
            status=Game.Status.ACTIVE,
            move_count=0,
        )
        self.assertEqual(live_games_queryset().count(), 0)

    def test_human_with_moves_included(self):
        g = Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            mode="blitz",
            status=Game.Status.ACTIVE,
            move_count=3,
        )
        self.assertIn(g, list(live_games_queryset()))


class TvExhibitionTests(TestCase):
    @patch("apps.games.tv_exhibition.ChessEngineService")
    def test_play_exhibition_move(self, EngineCls):
        engine = EngineCls.return_value
        engine.get_best_move.return_value = MagicMock(uci="e2e4")
        engine.apply_move.return_value = (
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "e4",
            None,
        )
        game = create_exhibition_game()
        self.assertTrue(game.is_tv_exhibition)
        result = play_exhibition_move(game)
        self.assertIsNotNone(result)
        game.refresh_from_db()
        self.assertEqual(game.move_count, 1)
        self.assertIn(game, list(live_games_queryset()))

    @patch("apps.games.tv_exhibition.ChessEngineService")
    def test_ensure_creates_one(self, EngineCls):
        engine = EngineCls.return_value
        engine.get_best_move.return_value = None
        games = ensure_tv_exhibitions(1)
        self.assertEqual(len(games), 1)
        self.assertTrue(games[0].is_tv_exhibition)

    def test_tv_api_empty_without_games(self):
        client = APIClient()
        res = client.get("/api/games/live/tv/?channel=best")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data.get("current"))
