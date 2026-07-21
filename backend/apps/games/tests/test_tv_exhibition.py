"""Tests TV exhibition IA + filtre parties fantômes."""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.game_actions import live_games_queryset
from apps.games.models import Game, GameAnalysis
from apps.games.tv_exhibition import (
    MAX_ACTIVE_EXHIBITIONS,
    create_exhibition_game,
    ensure_tv_exhibitions,
    play_exhibition_move,
    tv_analysis_payload,
    win_chance_from_eval,
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

    def test_human_vs_ai_with_moves_included(self):
        g = Game.objects.create(
            white_player=self.w,
            black_player=None,
            mode="ai",
            status=Game.Status.ACTIVE,
            is_vs_ai=True,
            move_count=2,
            ai_target_elo=1500,
        )
        self.assertIn(g, list(live_games_queryset()))

    def test_human_vs_ai_zero_moves_excluded(self):
        Game.objects.create(
            white_player=self.w,
            mode="ai",
            status=Game.Status.ACTIVE,
            is_vs_ai=True,
            move_count=0,
        )
        self.assertEqual(
            live_games_queryset().filter(is_vs_ai=True, is_tv_exhibition=False).count(),
            0,
        )


class TvExhibitionTests(TestCase):
    @patch("apps.games.tv_exhibition.append_move_analysis")
    @patch("apps.games.tv_exhibition.ChessEngineService")
    def test_play_exhibition_move(self, EngineCls, append_analysis):
        engine = EngineCls.return_value
        engine.get_best_move.return_value = MagicMock(uci="e2e4")
        engine.apply_move.return_value = (
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "e4",
            None,
        )
        append_analysis.return_value = {
            "san": "e4",
            "class": "book",
            "eval": 0.2,
            "win_chance_white": 52.0,
            "win_chance_black": 48.0,
        }
        game = create_exhibition_game()
        self.assertTrue(game.is_tv_exhibition)
        result = play_exhibition_move(game)
        self.assertIsNotNone(result)
        game.refresh_from_db()
        self.assertEqual(game.move_count, 1)
        self.assertIn(game, list(live_games_queryset()))
        append_analysis.assert_called_once()

    @patch("apps.games.tv_exhibition.ChessEngineService")
    def test_ensure_creates_five(self, EngineCls):
        engine = EngineCls.return_value
        engine.get_best_move.return_value = None
        games = ensure_tv_exhibitions(MAX_ACTIVE_EXHIBITIONS)
        self.assertEqual(len(games), 5)
        self.assertTrue(all(g.is_tv_exhibition for g in games))
        usernames = set()
        for g in games:
            usernames.add(g.white_player.username)
            usernames.add(g.black_player.username)
        self.assertGreaterEqual(len(usernames), 8)

    def test_win_chance_balanced(self):
        w, b = win_chance_from_eval(0.0)
        self.assertAlmostEqual(w, 50.0, delta=0.5)
        self.assertAlmostEqual(b, 50.0, delta=0.5)

    def test_tv_analysis_payload(self):
        game = create_exhibition_game()
        GameAnalysis.objects.filter(game=game).update(
            best_moves_json=[
                {
                    "uci": "e2e4",
                    "san": "e4",
                    "eval": 0.3,
                    "eval_before": 0.0,
                    "class": "book",
                    "cp_loss": 0,
                    "played_by_white": True,
                    "win_chance_white": 55.0,
                    "win_chance_black": 45.0,
                }
            ]
        )
        game.refresh_from_db()
        payload = tv_analysis_payload(game)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["last_move"]["class"], "book")
        self.assertEqual(payload["win_chance_white"], 55.0)
        self.assertEqual(len(payload["curve"]), 1)

    def test_tv_api_empty_without_games(self):
        client = APIClient()
        res = client.get("/api/games/live/tv/?channel=best")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data.get("current"))

    def test_head_to_head_counts(self):
        from apps.games.tv_exhibition import exhibition_head_to_head, ensure_tv_bot_users

        a, b = ensure_tv_bot_users()[:2]
        # a white wins
        Game.objects.create(
            white_player=a,
            black_player=b,
            mode="blitz",
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
            winner=a,
            is_tv_exhibition=True,
            move_count=40,
        )
        # b wins as white
        Game.objects.create(
            white_player=b,
            black_player=a,
            mode="blitz",
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
            winner=b,
            is_tv_exhibition=True,
            move_count=30,
        )
        # draw
        Game.objects.create(
            white_player=a,
            black_player=b,
            mode="blitz",
            status=Game.Status.DRAW,
            result=Game.Result.DRAW,
            is_tv_exhibition=True,
            move_count=80,
        )
        h2h = exhibition_head_to_head(a.id, b.id)
        self.assertEqual(h2h["white_wins"], 1)  # a
        self.assertEqual(h2h["black_wins"], 1)  # b
        self.assertEqual(h2h["draws"], 1)
        self.assertEqual(h2h["played"], 3)
        # Couleurs inversées
        swapped = exhibition_head_to_head(b.id, a.id)
        self.assertEqual(swapped["white_wins"], 1)
        self.assertEqual(swapped["black_wins"], 1)

    def test_rematch_after_length_limit(self):
        from apps.games.tv_exhibition import MAX_MOVES_BEFORE_RESTART

        game = create_exhibition_game()
        white, black = game.white_player, game.black_player
        game.move_count = MAX_MOVES_BEFORE_RESTART
        game.save(update_fields=["move_count"])
        result = play_exhibition_move(game)
        self.assertTrue(result["completed"])
        self.assertEqual(result["reason"], "length")
        game.refresh_from_db()
        self.assertNotEqual(game.status, Game.Status.ACTIVE)
        rematch = Game.objects.get(id=result["rematch_id"])
        self.assertEqual(rematch.status, Game.Status.ACTIVE)
        self.assertTrue(rematch.is_tv_exhibition)
        self.assertEqual(rematch.white_player_id, black.id)
        self.assertEqual(rematch.black_player_id, white.id)

    @patch("apps.games.tv_exhibition.play_exhibition_move")
    def test_tick_keeps_five_after_completion(self, play_move):
        from apps.games.tv_exhibition import tick_tv_exhibitions

        games = ensure_tv_exhibitions(5)
        finished = games[0]
        finished.status = Game.Status.COMPLETED
        finished.termination_reason = "checkmate"
        finished.save(update_fields=["status", "termination_reason"])
        # Rematch déjà créé (comme le ferait play_exhibition_move)
        create_exhibition_game(
            white=finished.black_player, black=finished.white_player
        )

        play_move.return_value = {"completed": False, "game_id": "x"}
        out = tick_tv_exhibitions()
        self.assertEqual(out["active"], 5)
        self.assertEqual(
            Game.objects.filter(
                status=Game.Status.ACTIVE, is_tv_exhibition=True
            ).count(),
            5,
        )