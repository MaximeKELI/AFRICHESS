"""Tests commentaires live (génération sync sans Stockfish)."""
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.games.engine import EngineMove
from apps.games.models import Game
from apps.games.services import GameService

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
class LiveMoveCommentsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="async_comments",
            email="async@test.local",
            password="x",
        )

    @patch("apps.games.services.GameService.__init__", lambda self: None)
    def test_make_move_writes_comments_sync_without_engine_analysis(self):
        mock_engine = MagicMock()
        mock_engine.apply_move.return_value = (
            "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            "e4",
            False,
        )
        mock_engine.get_best_move.return_value = EngineMove(uci="e7e5", san="e5")
        mock_engine.apply_move.side_effect = [
            (
                "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
                "e4",
                False,
            ),
            (
                "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
                "e5",
                False,
            ),
        ]

        svc = GameService()
        svc.engine = mock_engine
        svc.rating_service = MagicMock()

        game = Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            ai_target_elo=1200,
            ai_difficulty=8,
            status=Game.Status.ACTIVE,
        )

        result = svc.make_move(game, self.user, "e2e4", include_comments=True)

        self.assertNotIn("error", result)
        self.assertFalse(result.get("comments_pending"))
        mock_engine.analyze_position.assert_not_called()

        game.refresh_from_db()
        moves = list(game.moves.order_by("move_number", "played_by_white"))
        self.assertEqual(len(moves), 2)
        self.assertTrue(moves[0].comment.strip())
        self.assertTrue(moves[1].comment.strip())
        self.assertTrue(result["move"].comment.strip())
        self.assertTrue(result["ai_move_record"].comment.strip())

    def test_generate_move_comments_for_specs_updates_db_without_engine(self):
        from apps.games.commentary_async import generate_move_comments_for_specs
        from apps.games.models import Move

        game = Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            status=Game.Status.ACTIVE,
        )
        move = Move.objects.create(
            game=game,
            move_number=1,
            san="e4",
            uci="e2e4",
            from_square="e2",
            to_square="e4",
            fen_after=game.fen,
            played_by_white=True,
            comment="",
        )

        with patch(
            "apps.games.commentary.generate_move_comment",
            return_value="Coup solide.",
        ):
            count = generate_move_comments_for_specs(
                [
                    {
                        "move_id": move.pk,
                        "fen_before": game.fen,
                        "fen_after": game.fen,
                        "uci": "e2e4",
                        "san": "e4",
                        "played_by_ai": False,
                        "mover_is_white": True,
                        "move_number": 1,
                    }
                ],
                use_engine=False,
            )

        self.assertEqual(count, 1)
        move.refresh_from_db()
        self.assertEqual(move.comment, "Coup solide.")
