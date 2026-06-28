"""Tests du pool Stockfish (réutilisation du processus moteur)."""
from __future__ import annotations

import shutil
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import SimpleTestCase, TestCase

from apps.games.engine import ChessEngineService, close_stockfish_pool

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"


def stockfish_available() -> bool:
    return bool(settings.STOCKFISH_PATH and shutil.which(settings.STOCKFISH_PATH))


class EnginePoolUnitTests(SimpleTestCase):
    def tearDown(self):
        close_stockfish_pool()

    @patch("apps.games.engine.chess.engine.SimpleEngine.popen_uci")
    def test_pool_reuses_single_process(self, mock_popen):
        mock_engine = MagicMock()
        mock_engine.ping.return_value = None
        mock_popen.return_value = mock_engine

        svc = ChessEngineService(stockfish_path="/usr/bin/stockfish")
        svc.analyze_position(START, depth=6)
        svc.analyze_position(AFTER_E4, depth=6)
        svc.get_best_move(START, difficulty=5, target_elo=1200)

        mock_popen.assert_called_once()

    @patch("apps.games.engine.chess.engine.SimpleEngine.popen_uci")
    def test_pool_respawns_after_engine_error(self, mock_popen):
        mock_engine = MagicMock()
        mock_engine.ping.return_value = None
        mock_engine.analyse.side_effect = [
            chess_engine_error(),
            {"score": score_mock(0)},
        ]
        mock_popen.return_value = mock_engine

        svc = ChessEngineService(stockfish_path="/usr/bin/stockfish")
        svc.analyze_position(START, depth=6)
        svc.analyze_position(AFTER_E4, depth=6)

        self.assertEqual(mock_popen.call_count, 2)

    @patch("apps.games.engine.chess.engine.SimpleEngine.popen_uci")
    def test_close_pool_forces_new_spawn(self, mock_popen):
        mock_engine = MagicMock()
        mock_engine.ping.return_value = None
        mock_popen.return_value = mock_engine

        svc = ChessEngineService(stockfish_path="/usr/bin/stockfish")
        svc.analyze_position(START, depth=6)
        close_stockfish_pool()
        svc.analyze_position(AFTER_E4, depth=6)

        self.assertEqual(mock_popen.call_count, 2)
        mock_engine.quit.assert_called()


def chess_engine_error():
    import chess.engine

    return chess.engine.EngineError("simulated crash")


def score_mock(cp: int):
    import chess.engine

    mock = MagicMock()
    mock.white.return_value = chess.engine.PovScore(chess.engine.Cp(cp), chess.WHITE)
    return mock


class EnginePoolIntegrationTests(TestCase):
    """Avec Stockfish réel : plusieurs appels, un seul ping rapide."""

    def tearDown(self):
        close_stockfish_pool()

    def test_sequential_calls_share_engine(self):
        if not stockfish_available():
            self.skipTest("Stockfish non installé")

        import time

        svc = ChessEngineService()
        t0 = time.perf_counter()
        svc.analyze_position(START, depth=10)
        first = time.perf_counter() - t0

        t0 = time.perf_counter()
        svc.analyze_position(AFTER_E4, depth=10)
        second = time.perf_counter() - t0

        # Le 2e appel ne paie pas le coût de démarrage (~ plusieurs secondes à froid).
        self.assertLess(second, first * 0.85 + 0.05)
