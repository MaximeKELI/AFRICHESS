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

    def test_ai_taunt_when_crushing(self):
        text = generate_move_comment(
            START_FEN,
            "e2e4",
            "e4",
            played_by_ai=True,
            mover_is_white=True,
            move_number=1,
            eval_before=0.0,
            eval_after=7.0,
        )
        self.assertTrue(len(text) > 5)
        lowered = text.lower()
        self.assertTrue(
            "mat" in lowered or "sauvage" in lowered or "fini" in lowered or "cadeau" in lowered
        )

    def test_ai_acknowledges_mate_threat(self):
        fen = "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQ - 0 1"
        text = generate_move_comment(
            fen,
            "e8f8",
            "Kf8",
            played_by_ai=True,
            mover_is_white=False,
            move_number=5,
            eval_before=2.0,
            eval_after=6.0,
        )
        self.assertTrue(len(text) > 5)
        lowered = text.lower()
        self.assertTrue("mat" in lowered or "sauvage" in lowered or "pression" in lowered)

    def test_live_heuristic_works_without_engine_evals(self):
        """Commentaires live : eval matérielle interne, pas besoin de Stockfish."""
        text = generate_move_comment(
            START_FEN,
            "e2e4",
            "e4",
            played_by_ai=False,
            mover_is_white=True,
            move_number=1,
            eval_before=None,
            eval_after=None,
            best_san=None,
        )
        self.assertTrue(len(text) > 5)

    def test_ai_names_bird_opening(self):
        # 1. f4 : l'IA doit nommer l'ouverture de l'oiseau (Bird).
        text = generate_move_comment(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "f2f4",
            "f4",
            played_by_ai=True,
            mover_is_white=True,
            move_number=1,
            line_sans=["f4"],
        )
        self.assertIn("oiseau", text.lower())

    def test_ai_names_sicilian_defense(self):
        fen = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2"
        text = generate_move_comment(
            fen,
            "g1f3",
            "Nf3",
            played_by_ai=True,
            mover_is_white=True,
            move_number=3,
            line_sans=["e4", "c5", "Nf3"],
        )
        # move_number 3 : l'annonce est probabiliste ; on force plusieurs essais.
        found = any(
            "sicil"
            in generate_move_comment(
                fen,
                "g1f3",
                "Nf3",
                played_by_ai=True,
                mover_is_white=True,
                move_number=3,
                line_sans=["e4", "c5", "Nf3"],
            ).lower()
            for _ in range(40)
        )
        self.assertTrue(found)

    def test_player_opening_naming(self):
        text = generate_move_comment(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "e2e4",
            "e4",
            played_by_ai=False,
            mover_is_white=True,
            move_number=1,
            line_sans=["e4"],
        )
        self.assertIn("pion roi", text.lower())

    def test_capture_comment_without_engine(self):
        fen = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2"
        text = generate_move_comment(
            fen,
            "e4d5",
            "exd5",
            played_by_ai=True,
            mover_is_white=True,
            move_number=2,
        )
        self.assertTrue(len(text) > 5)
        lowered = text.lower()
        self.assertTrue(
            "prend" in lowered
            or "capture" in lowered
            or "pièce" in lowered
            or "cadeau" in lowered
            or "matériel" in lowered
            or "échange" in lowered
        )
