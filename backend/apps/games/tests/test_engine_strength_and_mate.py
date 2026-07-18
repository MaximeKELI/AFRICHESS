"""Tests unitaires (sans binaire Stockfish) :

- Le coup qui donne mat ne doit JAMAIS être classé « blunder » ni faire chuter
  la précision du gagnant (parcours : partie qui se termine par échec et mat).
- La force des bots doit descendre réellement pour les faibles ELO
  (mapping ELO → configuration moteur).
"""
from __future__ import annotations

import unittest
from contextlib import contextmanager

import chess
import chess.engine
from django.test import SimpleTestCase

from apps.games.analysis_utils import compute_move_accuracies
from apps.games.elo_config import STOCKFISH_UCI_MIN_ELO
from apps.games.engine import ChessEngineService

# Mat du berger : 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7# (mat livré par les Blancs)
SCHOLARS_MATE = ["e2e4", "e7e5", "f1c4", "b8c6", "d1h5", "g8f6", "h5f7"]
# Mat de l'imbécile : 1.f3 e5 2.g4 Qh4# (mat livré par les Noirs)
FOOLS_MATE = ["f2f3", "e7e5", "g2g4", "d8h4"]


def _board_after(ucis: list[str]) -> chess.Board:
    board = chess.Board()
    for uci in ucis:
        board.push_uci(uci)
    return board


class _FakeEngine:
    """Moteur factice : évalue toute position à 0 (neutre)."""

    def configure(self, opts):  # noqa: ARG002
        pass

    def analyse(self, board, limit):  # noqa: ARG002
        return {
            "score": chess.engine.PovScore(chess.engine.Cp(0), board.turn),
            "pv": [],
        }


class _CfgEngine:
    """Capture les options passées à engine.configure()."""

    def __init__(self) -> None:
        self.cfg: dict = {}

    def configure(self, opts):
        self.cfg.update(opts)


class ScoreToCpMateTests(SimpleTestCase):
    """Le score Mate(0) (position déjà mat) doit être orienté correctement."""

    def test_white_delivers_mate_is_positive(self):
        board = _board_after(SCHOLARS_MATE)
        self.assertTrue(board.is_checkmate())
        # Noirs au trait et matés → du point de vue des Blancs : +10000
        score = chess.engine.PovScore(chess.engine.Mate(0), board.turn).white()
        self.assertEqual(ChessEngineService._score_to_cp(score, board), 10000)

    def test_black_delivers_mate_is_negative(self):
        board = _board_after(FOOLS_MATE)
        self.assertTrue(board.is_checkmate())
        # Blancs au trait et matés → du point de vue des Blancs : -10000
        score = chess.engine.PovScore(chess.engine.Mate(0), board.turn).white()
        self.assertEqual(ChessEngineService._score_to_cp(score, board), -10000)

    def test_regular_mate_scores(self):
        board = chess.Board()
        pos_mate = chess.engine.PovScore(chess.engine.Mate(3), chess.WHITE).white()
        neg_mate = chess.engine.PovScore(chess.engine.Mate(-3), chess.WHITE).white()
        self.assertEqual(ChessEngineService._score_to_cp(pos_mate, board), 10000)
        self.assertEqual(ChessEngineService._score_to_cp(neg_mate, board), -10000)


class TerminalEvalTests(SimpleTestCase):
    def test_white_win(self):
        board = _board_after(SCHOLARS_MATE)
        self.assertEqual(ChessEngineService._terminal_eval_cp(board), 10000)

    def test_black_win(self):
        board = _board_after(FOOLS_MATE)
        self.assertEqual(ChessEngineService._terminal_eval_cp(board), -10000)

    def test_stalemate_is_draw(self):
        # Position de pat classique (roi noir au trait, aucun coup légal).
        board = chess.Board("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")
        self.assertTrue(board.is_stalemate())
        self.assertEqual(ChessEngineService._terminal_eval_cp(board), 0)


class CheckmateNotBlunderTests(SimpleTestCase):
    """Parcours : partie complète finissant par mat → coup de mat = meilleur."""

    def _analyze(self, ucis: list[str]):
        svc = ChessEngineService()

        @contextmanager
        def fake_use_engine():
            yield _FakeEngine()

        svc._use_engine = fake_use_engine  # type: ignore[assignment]
        moves = []
        board = chess.Board()
        for uci in ucis:
            moves.append((uci, board.turn == chess.WHITE))
            board.push_uci(uci)
        return svc.analyze_game_moves(moves, depth=6)

    def test_white_mating_move_is_best_not_blunder(self):
        evals = self._analyze(SCHOLARS_MATE)
        self.assertEqual(len(evals), len(SCHOLARS_MATE))
        mating = evals[-1]
        self.assertEqual(mating.san, "Qxf7#")
        self.assertEqual(mating.centipawn_loss, 0)
        self.assertEqual(mating.classification, "best")

    def test_white_accuracy_not_reduced_by_mate(self):
        evals = self._analyze(SCHOLARS_MATE)
        rows: list[tuple[str, bool]] = []
        board = chess.Board()
        for uci in SCHOLARS_MATE:
            rows.append((uci, board.turn == chess.WHITE))
            board.push_uci(uci)
        acc_w, _acc_b = compute_move_accuracies(evals, rows)
        self.assertIsNotNone(acc_w)
        # Aucune gaffe blanche : précision quasi parfaite malgré le mat.
        self.assertGreater(acc_w, 95.0)

    def test_no_white_move_classified_blunder(self):
        evals = self._analyze(SCHOLARS_MATE)
        board = chess.Board()
        for i, uci in enumerate(SCHOLARS_MATE):
            if board.turn == chess.WHITE:
                self.assertNotEqual(evals[i].classification, "blunder")
            board.push_uci(uci)

    def test_black_mating_move_is_best(self):
        evals = self._analyze(FOOLS_MATE)
        mating = evals[-1]
        self.assertEqual(mating.san, "Qh4#")
        self.assertEqual(mating.centipawn_loss, 0)
        self.assertEqual(mating.classification, "best")


class BotStrengthMappingTests(SimpleTestCase):
    def setUp(self):
        self.svc = ChessEngineService()

    def test_skill_level_low_for_beginners(self):
        self.assertEqual(self.svc._skill_level_for_elo(400), 0)
        self.assertLessEqual(self.svc._skill_level_for_elo(1000), 4)

    def test_skill_level_monotonic(self):
        elos = [300, 600, 900, 1100, 1300, 1500, 1800, 2200, 2600, 3000]
        skills = [self.svc._skill_level_for_elo(e) for e in elos]
        self.assertEqual(skills, sorted(skills))

    def test_low_elo_floors_uci_elo(self):
        # Sous le plancher UCI, on borne UCI_Elo à 1320 ; la faiblesse vient des
        # coups faibles injectés séparément (pas du plein régime bridé par la
        # profondeur, ancienne cause des bots « trop forts »).
        eng = _CfgEngine()
        mode = self.svc._configure_strength(eng, 1000)
        self.assertEqual(mode, "uci_elo")
        self.assertTrue(eng.cfg.get("UCI_LimitStrength"))
        self.assertEqual(eng.cfg.get("UCI_Elo"), STOCKFISH_UCI_MIN_ELO)

    def test_below_floor_still_floors_uci_elo(self):
        eng = _CfgEngine()
        self.svc._configure_strength(eng, 300)
        self.assertEqual(eng.cfg.get("UCI_Elo"), STOCKFISH_UCI_MIN_ELO)

    def test_mid_elo_uses_uci_elo(self):
        eng = _CfgEngine()
        mode = self.svc._configure_strength(eng, 1600)
        self.assertEqual(mode, "uci_elo")
        self.assertTrue(eng.cfg.get("UCI_LimitStrength"))
        self.assertEqual(eng.cfg.get("UCI_Elo"), 1600)

    def test_high_elo_capped_at_uci_max(self):
        from apps.games.elo_config import STOCKFISH_UCI_MAX_ELO

        eng = _CfgEngine()
        self.svc._configure_strength(eng, 5000)
        self.assertEqual(eng.cfg.get("UCI_Elo"), STOCKFISH_UCI_MAX_ELO)

    def test_skill_fallback_when_uci_unavailable(self):
        class _NoUciEngine:
            def __init__(self):
                self.cfg = {}

            def configure(self, opts):
                if "UCI_Elo" in opts:
                    raise chess.engine.EngineError("UCI_Elo non supporté")
                self.cfg.update(opts)

        eng = _NoUciEngine()
        mode = self.svc._configure_strength(eng, 1000)
        self.assertEqual(mode, "skill")
        self.assertIn("Skill Level", eng.cfg)

    def test_play_limit_monotonic_time(self):
        # Le budget de réflexion croît avec l'ELO (mode UCI_Elo).
        elos = [1000, 1400, 1800, 2300, 2800]
        times = [self.svc._play_limit(e).time for e in elos]
        self.assertEqual(times, sorted(times))

    def test_random_weak_move_only_for_low_elo(self):
        from unittest.mock import patch

        board = chess.Board()
        with patch("apps.games.engine.random.random", return_value=0.0):
            self.assertIsNotNone(self.svc._maybe_random_weak_move(board, 900))
        # ELO élevé : jamais de coup aléatoire, même si random renvoie 0.
        with patch("apps.games.engine.random.random", return_value=0.0):
            self.assertIsNone(self.svc._maybe_random_weak_move(board, 2000))

    def test_low_depth_for_weak_elo(self):
        weak = self.svc._limit_for_weak_elo(1000)
        strong = self.svc._limit_for_weak_elo(2200)
        self.assertLess(weak.depth, strong.depth)
        self.assertLessEqual(weak.depth, 4)


import os  # noqa: E402
import shutil  # noqa: E402


def _stockfish_available() -> bool:
    from apps.games.engine import _resolve_stockfish_path

    path = _resolve_stockfish_path()
    return bool(path) and os.path.isfile(path) and os.access(path, os.X_OK)


@unittest.skipUnless(
    os.environ.get("RUN_ENGINE_MATCH") and _stockfish_available(),
    "Match moteur lent : activer avec RUN_ENGINE_MATCH=1 et un binaire Stockfish.",
)
class EngineHierarchyMatchTests(SimpleTestCase):
    """Preuve avec Stockfish réel : un ELO élevé bat nettement un ELO faible."""

    def _play(self, white_elo: int, black_elo: int, max_fullmoves: int = 50) -> float:
        from apps.games.engine import ChessEngineService, close_stockfish_pool

        svc = ChessEngineService()
        board = chess.Board()
        while not board.is_game_over(claim_draw=True) and board.fullmove_number <= max_fullmoves:
            elo = white_elo if board.turn == chess.WHITE else black_elo
            em = svc.get_best_move(board.fen(), target_elo=elo)
            if not em:
                break
            mv = chess.Move.from_uci(em.uci)
            if mv not in board.legal_moves:
                break
            board.push(mv)
        close_stockfish_pool()
        outcome = board.outcome(claim_draw=True)
        if outcome is None or outcome.winner is None:
            return 0.5
        return 1.0 if outcome.winner == chess.WHITE else 0.0

    def test_strong_bot_beats_weak_bot(self):
        # 2500 contre 600, une partie de chaque couleur : le fort doit dominer.
        strong_as_white = self._play(2500, 600)
        strong_as_black = 1.0 - self._play(600, 2500)
        self.assertGreaterEqual(strong_as_white + strong_as_black, 1.5)
