"""Tests commentaires de coups."""
from django.test import SimpleTestCase

from apps.games.commentary import generate_move_comment

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


class CommentaryTests(SimpleTestCase):
    def test_opening_comment_not_empty(self):
        text = generate_move_comment(
            START_FEN,
            "e2e4",
            "e4",
            played_by_ai=True,
            mover_is_white=True,
            move_number=1,
        )
        self.assertTrue(len(text) > 5)

    def test_scholars_mate_comment_is_check_or_mate(self):
        fen = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
        text = generate_move_comment(
            fen,
            "h5f7",
            "Qxf7#",
            played_by_ai=True,
            mover_is_white=True,
            move_number=4,
        )
        self.assertTrue(
            "mat" in text.lower() or "échec" in text.lower() or "Mat" in text
        )

    def test_player_weak_move_coaching(self):
        fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        text = generate_move_comment(
            fen,
            "f7f6",
            "f6",
            played_by_ai=False,
            mover_is_white=False,
            move_number=1,
            eval_before=0.5,
            eval_after=-2.0,
        )
        self.assertTrue(len(text) > 5)
