from django.test import TestCase

from apps.games.draw_rules import board_from_game_moves, can_claim_threefold_from_game
from apps.games.models import Game, Move


class ThreefoldRepetitionTests(TestCase):
    def test_detects_threefold(self):
        """Position répétée 3 fois → nulle réclamable."""
        game = Game.objects.create(is_vs_ai=True, mode="blitz")
        # Séquence courte qui peut répéter (Nf3 Ng8 Nf3 Ng8 Nf3)
        ucis = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6"]
        for i, uci in enumerate(ucis, start=1):
            Move.objects.create(
                game=game,
                move_number=i,
                san=f"m{i}",
                uci=uci,
                from_square=uci[:2],
                to_square=uci[2:4],
                played_by_white=i % 2 == 1,
            )
        self.assertTrue(can_claim_threefold_from_game(game))
        board = board_from_game_moves(game)
        self.assertTrue(board.can_claim_threefold_repetition())
