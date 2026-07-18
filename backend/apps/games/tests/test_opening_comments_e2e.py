"""E2E : le parcours réel de partie IA nomme bien l'ouverture dans le commentaire.

On mock uniquement le choix de coup de Stockfish (get_best_move) ; tout le reste
du parcours passe par le vrai chemin : services.make_move -> _finalize_live_comments
-> generate_move_comments_for_specs -> generate_move_comment (avec reconstruction de
la ligne pour nommer l'ouverture). apply_move reste réel (python-chess, sans moteur).
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.engine import EngineMove
from apps.games.models import Game
from apps.games.services import GameService

User = get_user_model()


class OpeningCommentsE2ETests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="e2e_open", email="e2e@test.com", password="x"
        )
        # Réponses IA scriptées, dans l'ordre des appels (sicilienne).
        self._script = iter([("c7c5", "c5"), ("d7d6", "d6"), ("g8f6", "Nf6")])

    def _ai_reply(self, *args, **kwargs):
        try:
            uci, san = next(self._script)
        except StopIteration:
            uci, san = ("g8f6", "Nf6")
        return EngineMove(uci=uci, san=san)

    def test_ai_names_sicilian_during_live_game(self):
        svc = GameService()
        with patch.object(svc.engine, "get_best_move", side_effect=self._ai_reply):
            game = svc.create_ai_game(
                self.user, mode="blitz", color="white", ai_elo=1400
            )
            # 1.e4  (le joueur) -> l'IA répond 1...c5
            result = svc.make_move(game, self.user, "e2e4", include_comments=True)

        self.assertNotIn("error", result)
        game.refresh_from_db()

        moves = list(game.moves.order_by("move_number", "created_at"))
        self.assertGreaterEqual(len(moves), 2)

        ai_move = moves[1]
        self.assertEqual(ai_move.san, "c5")
        self.assertFalse(ai_move.played_by_white)
        self.assertTrue(ai_move.comment.strip(), "le coup IA doit avoir un commentaire")
        # Le commentaire live de l'IA doit nommer l'ouverture (sicilienne).
        self.assertIn(
            "sicil",
            ai_move.comment.lower(),
            f"commentaire IA sans ouverture : {ai_move.comment!r}",
        )

    def test_player_first_move_comment_names_opening(self):
        svc = GameService()
        with patch.object(svc.engine, "get_best_move", side_effect=self._ai_reply):
            game = svc.create_ai_game(
                self.user, mode="blitz", color="white", ai_elo=1400
            )
            svc.make_move(game, self.user, "e2e4", include_comments=True)

        game.refresh_from_db()
        player_move = game.moves.order_by("move_number").first()
        self.assertEqual(player_move.san, "e4")
        # e4 : « Partie du pion roi » -> phrase de lore reconnaissable.
        self.assertTrue(player_move.comment.strip())
