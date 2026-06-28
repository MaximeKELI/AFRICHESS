"""Tests réponse move allégée (delta)."""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.models import Game, Move
from apps.games.serializers import serialize_game_move_delta

User = get_user_model()


class MoveDeltaSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="delta_user", password="x")

    def test_delta_contains_new_moves_only(self):
        game = Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            status=Game.Status.ACTIVE,
            move_count=2,
        )
        m1 = Move.objects.create(
            game=game,
            move_number=1,
            san="e4",
            uci="e2e4",
            from_square="e2",
            to_square="e4",
            fen_after=game.fen,
            played_by_white=True,
        )
        m2 = Move.objects.create(
            game=game,
            move_number=2,
            san="e5",
            uci="e7e5",
            from_square="e7",
            to_square="e5",
            fen_after=game.fen,
            played_by_white=False,
        )

        payload = serialize_game_move_delta(
            game,
            {"move": m1, "ai_move_record": m2, "game_over": False},
        )

        self.assertTrue(payload["delta"])
        self.assertEqual(len(payload["new_moves"]), 2)
        self.assertEqual(payload["new_moves"][0]["san"], "e4")
        self.assertEqual(payload["new_moves"][1]["san"], "e5")
        self.assertNotIn("moves", payload)
        self.assertIn("fen", payload)
        self.assertIn("white_time_ms", payload)
