"""Tests analyse automatique post-partie."""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.games.models import AnalysisJob, Game, GameAnalysis, Move
from apps.games.stats_service import on_game_completed

from ..game_analysis_service import game_needs_auto_analysis

User = get_user_model()


def _completed_game(**kwargs) -> Game:
    defaults = {
        "status": Game.Status.COMPLETED,
        "result": Game.Result.WHITE_WIN,
        "mode": Game.Mode.BLITZ,
        "move_count": 10,
    }
    defaults.update(kwargs)
    return Game.objects.create(**defaults)


class GameNeedsAutoAnalysisTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="auto_w", password="x")
        self.black = User.objects.create_user(username="auto_b", password="x")

    def test_skips_when_disabled(self):
        game = _completed_game(white_player=self.white, black_player=self.black)
        with override_settings(AUTO_GAME_ANALYSIS_ENABLED=False):
            self.assertFalse(game_needs_auto_analysis(game))

    def test_skips_aborted_game(self):
        game = _completed_game(
            white_player=self.white,
            black_player=self.black,
            result=Game.Result.ABORTED,
        )
        self.assertFalse(game_needs_auto_analysis(game))

    def test_skips_too_few_moves(self):
        game = _completed_game(
            white_player=self.white,
            black_player=self.black,
            move_count=1,
        )
        with override_settings(AUTO_GAME_ANALYSIS_MIN_MOVES=2):
            self.assertFalse(game_needs_auto_analysis(game))

    def test_skips_when_analysis_exists(self):
        game = _completed_game(white_player=self.white, black_player=self.black)
        GameAnalysis.objects.create(
            game=game,
            accuracy_white=90,
            accuracy_black=88,
            best_moves_json=[{"uci": "e2e4", "san": "e4", "class": "good"}],
        )
        self.assertFalse(game_needs_auto_analysis(game))

    def test_skips_when_job_running(self):
        game = _completed_game(white_player=self.white, black_player=self.black)
        AnalysisJob.objects.create(
            game=game,
            user=self.white,
            status=AnalysisJob.Status.RUNNING,
            depth=12,
        )
        self.assertFalse(game_needs_auto_analysis(game))

    def test_needs_analysis_for_fresh_completed_game(self):
        game = _completed_game(white_player=self.white, black_player=self.black)
        self.assertTrue(game_needs_auto_analysis(game))


class OnGameCompletedAutoAnalysisTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="hook_w", password="x")
        self.black = User.objects.create_user(username="hook_b", password="x")

    @patch("apps.games.analysis_async.schedule_auto_game_analysis")
    def test_on_game_completed_schedules_auto_analysis(self, mock_schedule):
        game = _completed_game(white_player=self.white, black_player=self.black)
        for i in range(4):
            Move.objects.create(
                game=game,
                move_number=i + 1,
                san="e4" if i % 2 == 0 else "e5",
                uci="e2e4" if i % 2 == 0 else "e7e5",
                from_square="e2" if i % 2 == 0 else "e7",
                to_square="e4" if i % 2 == 0 else "e5",
                fen_after="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
                played_by_white=i % 2 == 0,
            )
        on_game_completed(game)
        mock_schedule.assert_called_once_with(str(game.id))


class RunAutoGameAnalysisTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="run_auto", password="x")

    @patch("apps.games.ws_notify.notify_analysis_ready")
    @patch("apps.games.game_analysis_service.build_and_save_game_analysis")
    def test_run_auto_game_analysis_notifies_when_saved(self, mock_build, mock_notify):
        from apps.games.analysis_async import run_auto_game_analysis

        game = _completed_game(white_player=self.user, is_vs_ai=True)
        mock_build.return_value = MagicMock()
        run_auto_game_analysis(str(game.id))
        mock_build.assert_called_once()
        mock_notify.assert_called_once()

    @patch("apps.games.game_analysis_service.build_and_save_game_analysis")
    def test_run_auto_game_analysis_skips_existing(self, mock_build):
        from apps.games.analysis_async import run_auto_game_analysis

        game = _completed_game(white_player=self.user, is_vs_ai=True)
        GameAnalysis.objects.create(
            game=game,
            accuracy_white=90,
            accuracy_black=88,
            best_moves_json=[{"uci": "e2e4", "san": "e4", "class": "good"}],
        )
        run_auto_game_analysis(str(game.id))
        mock_build.assert_not_called()
