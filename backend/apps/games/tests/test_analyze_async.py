"""Tests analyse async avec repli thread."""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.games.analysis_async import schedule_analyze_game
from apps.games.models import AnalysisJob, Game

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "apps.users.authentication.AfrichessJWTAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_THROTTLE_CLASSES": [],
    }
)
class AnalyzeAsyncScheduleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="analyze_async", password="x")
        self.game = Game.objects.create(
            white_player=self.user,
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
            is_vs_ai=True,
        )
        self.job = AnalysisJob.objects.create(
            game=self.game,
            user=self.user,
            depth=12,
        )

    @patch("apps.games.analysis_async.threading.Thread")
    @patch("apps.games.tasks.analyze_game_async.delay", side_effect=ConnectionError("broker down"))
    def test_schedule_falls_back_to_thread(self, _delay, mock_thread):
        mock_thread.return_value = MagicMock()
        schedule_analyze_game(str(self.game.id), self.job.id)
        mock_thread.assert_called_once()
        args = mock_thread.call_args
        self.assertEqual(args.kwargs.get("daemon"), True)

    @patch("apps.games.tasks.analyze_game_async.delay")
    def test_schedule_uses_celery_when_available(self, mock_delay):
        schedule_analyze_game(str(self.game.id), self.job.id)
        mock_delay.assert_called_once_with(str(self.game.id), self.job.id)
