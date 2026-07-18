from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.models import Game, Move
from apps.games.services import GameService

User = get_user_model()


class TmpOpeningLiveTests(TestCase):
    def test_live_full_opening(self):
        u = User.objects.create_user(username="x", email="x@x.com", password="p")
        svc = GameService()
        game = svc.create_ai_game(u, mode="blitz", color="white", ai_elo=1500)
        # Sicilienne : e4 c5 ...
        for uci in ["e2e4", "g1f3", "d2d4"]:
            svc.make_move(game, u, uci, include_comments=True)
            game.refresh_from_db()
        print("\n=== COMMENTS ===")
        for m in game.moves.order_by("move_number", "created_at"):
            who = "IA" if (m.played_by_white != True) else "Joueur"
            print(f"{m.move_number:>2} {m.san:<6} [{who}] {m.comment!r}")
        self.assertTrue(True)
