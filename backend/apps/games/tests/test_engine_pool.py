"""Tests du pool Stockfish (réutilisation du processus moteur)."""
from __future__ import annotations

import shutil
from unittest.mock import MagicMock, patch

import chess
import chess.engine
from django.conf import settings
from django.test import SimpleTestCase, TestCase

from apps.games.engine import ChessEngineService, close_stockfish_pool

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"


def stockfish_available() -> bool:
    return bool(settings.STOCKFISH_PATH and shutil.which(settings.STOCKFISH_PATH))


def _analysis_info(cp: int = 25) -> dict:
    score = chess.engine.PovScore(chess.engine.Cp(cp), chess.WHITE)
    return {"score": score}


def _mock_engine() -> MagicMock:
    engine = MagicMock()
    engine.ping.return_value = None
    engine.analyse.return_value = _analysis_info()
    move = chess.Move.from_uci("e7e5")
    played = chess.engine.PlayResult(move, None)
    engine.play.return_value = played
    engine.configure.return_value = None
    return engine


class EnginePoolUnitTests(SimpleTestCase):
    def tearDown(self):
        close_stockfish_pool()

    @patch("apps.games.engine.chess.engine.SimpleEngine.popen_uci")
    def test_pool_reuses_single_process(self, mock_popen):
        mock_popen.return_value = _mock_engine()
        svc = ChessEngineService(stockfish_path="/usr/bin/stockfish")

        svc.analyze_position(START, depth=6)
        svc.analyze_position(AFTER_E4, depth=6)
        svc.get_best_move(START, difficulty=5, target_elo=1200)

        mock_popen.assert_called_once()

    @patch("apps.games.engine.chess.engine.SimpleEngine.popen_uci")
    def test_pool_respawns_after_engine_error(self, mock_popen):
        broken = _mock_engine()
        broken.analyse.side_effect = chess.engine.EngineError("simulated crash")
        healthy = _mock_engine()
        mock_popen.side_effect = [broken, healthy]

        svc = ChessEngineService(stockfish_path="/usr/bin/stockfish")
        self.assertIsNone(svc.analyze_position(START, depth=6))
        self.assertIsNotNone(svc.analyze_position(AFTER_E4, depth=6))

        self.assertEqual(mock_popen.call_count, 2)
        broken.quit.assert_called()

    @patch("apps.games.engine.chess.engine.SimpleEngine.popen_uci")
    def test_close_pool_forces_new_spawn(self, mock_popen):
        mock_popen.return_value = _mock_engine()
        svc = ChessEngineService(stockfish_path="/usr/bin/stockfish")

        svc.analyze_position(START, depth=6)
        close_stockfish_pool()
        svc.analyze_position(AFTER_E4, depth=6)

        self.assertEqual(mock_popen.call_count, 2)


class EnginePoolIntegrationTests(TestCase):
    def setUp(self):
        close_stockfish_pool()

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

        self.assertLess(second, max(first * 0.9, first - 0.5))
