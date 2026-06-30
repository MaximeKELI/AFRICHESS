from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.games.game_actions import abort_game, accept_takeback, offer_takeback, resign_game
from apps.games.models import Game, Move

User = get_user_model()


class GameActionsTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="w_act", password="x")
        self.black = User.objects.create_user(username="b_act", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
            is_rated=False,
            started_at=timezone.now(),
            move_count=0,
        )

    def test_abort_empty_game(self):
        result = abort_game(self.game, self.white)
        self.assertTrue(result.get("ok"))
        self.game.refresh_from_db()
        self.assertEqual(self.game.status, Game.Status.ABORTED)

    def test_takeback_removes_last_move(self):
        Move.objects.create(
            game=self.game,
            move_number=1,
            uci="e2e4",
            san="e4",
            played_by_white=True,
        )
        self.game.move_count = 1
        self.game.fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        self.game.save()
        offer_takeback(self.game, self.white)
        result = accept_takeback(self.game, self.black)
        self.assertTrue(result.get("ok"))
        self.game.refresh_from_db()
        self.assertEqual(self.game.move_count, 0)
