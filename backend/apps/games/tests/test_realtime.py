from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.models import Game, GameRoom, MatchmakingQueue
from apps.games.room_utils import ensure_game_room, uci_to_squares
from apps.games.services import MatchmakingService

User = get_user_model()


class RealtimeUtilsTests(TestCase):
    def test_uci_to_squares(self):
        self.assertEqual(uci_to_squares("e2e4"), ("e2", "e4"))

    def test_ensure_game_room(self):
        u = User.objects.create_user(username="r1", password="x")
        game = Game.objects.create(white_player=u, status=Game.Status.ACTIVE)
        room = ensure_game_room(game)
        self.assertEqual(room.game_id, game.id)


class MatchmakingPairTests(TestCase):
    def test_pair_all_waiting(self):
        a = User.objects.create_user(username="p1", password="x")
        b = User.objects.create_user(username="p2", password="x")
        svc = MatchmakingService()
        svc.join_queue(a, "blitz", 1200)
        svc.join_queue(b, "blitz", 1250)
        svc.pair_all_waiting()
        self.assertEqual(MatchmakingQueue.objects.count(), 0)
        self.assertEqual(Game.objects.filter(is_vs_ai=False).count(), 1)
