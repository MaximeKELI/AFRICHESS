"""Tests commentaires de coups."""
from django.test import SimpleTestCase

from apps.games.commentary import OPENING_LORE, generate_move_comment

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
        lowered = text.lower()
        self.assertTrue("oiseau" in lowered or "bird" in lowered)

    def test_ai_names_sicilian_defense(self):
        """Nf3 des Blancs après …c5 ne doit PAS ré-annoncer la sicilienne
        (déjà établie) — sinon on l'attribue au mauvais camp."""
        fen = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2"
        texts = {
            generate_move_comment(
                fen,
                "g1f3",
                "Nf3",
                played_by_ai=True,
                mover_is_white=True,
                move_number=3,
                line_sans=["e4", "c5", "Nf3"],
            )
            for _ in range(30)
        }
        self.assertFalse(any("sicil" in t.lower() for t in texts))

    def test_ai_own_sicilian_not_your_defense(self):
        """Quand l'IA (Noirs) joue …c5, elle dit « Je joue la Défense… »,
        pas le lore « pour toi » réservé au joueur humain."""
        from apps.games.commentary import OPENING_LORE

        fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        texts = {
            generate_move_comment(
                fen,
                "c7c5",
                "c5",
                played_by_ai=True,
                mover_is_white=False,
                move_number=2,
                line_sans=["e4", "c5"],
            )
            for _ in range(40)
        }
        self.assertTrue(any("sicil" in t.lower() for t in texts))
        self.assertFalse(texts & set(OPENING_LORE["Défense sicilienne"]))
        for t in texts:
            self.assertNotIn("pour toi", t.lower())
            self.assertTrue(
                t.lower().startswith("je ")
                or t.lower().startswith("moi")
                or "je joue" in t.lower()
                or "je sors" in t.lower()
                or "je pose" in t.lower()
                or "je tente" in t.lower()
                or "c'est mon" in t.lower(),
                msg=f"attendu perspective IA, reçu: {t!r}",
            )

    def test_ai_uses_sicilian_lore(self):
        # 1...c5 : le JOUEUR (Noirs) joue la sicilienne -> phrases de lore OK.
        fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        text = generate_move_comment(
            fen,
            "c7c5",
            "c5",
            played_by_ai=False,
            mover_is_white=False,
            move_number=2,
            line_sans=["e4", "c5"],
        )
        self.assertIn(text, OPENING_LORE["Défense sicilienne"])

    def test_queens_gambit_lore_mentions_context(self):
        # Exemple demandé : le gambit de la dame, joué par grands maîtres et débutants.
        fen = "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2"
        text = generate_move_comment(
            fen,
            "c2c4",
            "c4",
            played_by_ai=True,
            mover_is_white=True,
            move_number=3,
            line_sans=["d4", "d5", "c4"],
        )
        # move_number 3 : annonce probabiliste, on force plusieurs essais.
        texts = {
            generate_move_comment(
                fen,
                "c2c4",
                "c4",
                played_by_ai=True,
                mover_is_white=True,
                move_number=3,
                line_sans=["d4", "d5", "c4"],
            )
            for _ in range(60)
        }
        self.assertTrue(texts & set(OPENING_LORE["Gambit dame"]))

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
        # « Partie du pion roi » dispose de phrases de lore (1.e4 …).
        from apps.games.commentary import OPENING_LORE as _LORE

        self.assertIn(text, _LORE["Partie du pion roi"])

    def test_gambit_capture_named_during_opening(self):
        """Une prise qui prolonge une ligne nommée (gambit) doit être nommée,
        au lieu du commentaire de prise générique, pendant l'ouverture."""
        # 1.d4 d5 2.c4 dxc4 : Gambit dame accepté (prise au coup 4).
        fen = "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2"
        line = ["d4", "d5", "c4", "dxc4"]
        texts = {
            generate_move_comment(
                fen,
                "d5c4",
                "dxc4",
                played_by_ai=False,
                mover_is_white=False,
                move_number=4,
                line_sans=line,
            )
            for _ in range(60)
        }
        joined = " ".join(texts).lower()
        self.assertTrue("gambit" in joined or "accept" in joined)

    def test_opening_named_beyond_move_two(self):
        """Après …c5, Nf3 ne ré-annonce plus la sicilienne (déjà établie)."""
        fen = "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2"
        texts = {
            generate_move_comment(
                fen,
                "g1f3",
                "Nf3",
                played_by_ai=True,
                mover_is_white=True,
                move_number=3,
                line_sans=["e4", "c5", "Nf3"],
            )
            for _ in range(25)
        }
        self.assertFalse(texts & set(OPENING_LORE["Défense sicilienne"]))

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
