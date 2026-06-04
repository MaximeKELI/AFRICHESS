"""Tests parties IA (API + service, moteur mocké ou réel)."""
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.engine import EngineMove
from apps.games.models import Game
from apps.games.services import GameService

User = get_user_model()


class CreateAIGameServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="aitest",
            email="aitest@test.com",
            password="testpass123",
            chess_level="intermediate",
        )

    @patch.object(GameService, "__init__", lambda self: None)
    def _service_with_mock_engine(self, mock_engine):
        svc = GameService()
        svc.engine = mock_engine
        svc.rating_service = MagicMock()
        return svc

    @patch("apps.games.services.GameService.__init__", lambda self: None)
    def test_create_ai_stores_target_elo_5000(self):
        mock_engine = MagicMock()
        mock_engine.get_best_move.return_value = None
        svc = GameService()
        svc.engine = mock_engine
        svc.rating_service = MagicMock()

        game = svc.create_ai_game(
            self.user, mode="blitz", color="white", ai_elo=5000
        )
        self.assertEqual(game.ai_target_elo, 5000)
        self.assertTrue(game.is_vs_ai)

    @patch("apps.games.services.GameService.__init__", lambda self: None)
    def test_make_move_calls_engine_with_game_elo(self):
        mock_engine = MagicMock()
        mock_engine.apply_move.return_value = (
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "e4",
            False,
        )
        mock_engine.get_best_move.return_value = EngineMove(uci="e7e5", san="e5")

        svc = GameService()
        svc.engine = mock_engine
        svc.rating_service = MagicMock()

        game = Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            ai_target_elo=3200,
            ai_difficulty=14,
            status=Game.Status.ACTIVE,
        )

        result = svc.make_move(game, self.user, "e2e4")
        self.assertNotIn("error", result)
        mock_engine.get_best_move.assert_called_once()
        call_kwargs = mock_engine.get_best_move.call_args
        self.assertEqual(call_kwargs.kwargs.get("target_elo"), 3200)


class AIGameAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="api_aitest",
            email="api@test.com",
            password="testpass123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch("apps.games.views.GameService.create_ai_game")
    def test_create_ai_api_passes_ai_elo(self, mock_create):
        game = Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            ai_target_elo=3800,
            status=Game.Status.ACTIVE,
        )
        mock_create.return_value = game

        response = self.client.post(
            "/api/games/ai/",
            {"mode": "blitz", "color": "white", "ai_elo": 3800},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["ai_target_elo"], 3800)
        mock_create.assert_called_once()
        self.assertEqual(mock_create.call_args.kwargs.get("ai_elo"), 3800)

    def test_ai_preview_returns_chosen_elo(self):
        response = self.client.get(
            "/api/games/ai/preview/",
            {"mode": "blitz", "ai_elo": 4500},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ai_target_elo"], 4500)
        self.assertEqual(response.data["max_ai_elo"], 5000)


class EngineLimitTests(TestCase):
    """Vérifie que le moteur choisit UCI ou profondeur selon l'ELO."""

    def test_limit_for_monster_uses_deep_search(self):
        from apps.games.engine import ChessEngineService
        import chess.engine

        svc = ChessEngineService()
        limit = svc._limit_for_elo(5000, difficulty=20)
        self.assertIsInstance(limit, chess.engine.Limit)
        self.assertGreaterEqual(limit.depth or 0, 28)

    def test_limit_for_club_uses_uci_range(self):
        from apps.games.elo_config import STOCKFISH_UCI_MAX_ELO

        svc = ChessEngineService()
        limit = svc._limit_for_elo(1200, difficulty=6)
        self.assertTrue(
            1200 <= STOCKFISH_UCI_MAX_ELO
        )
