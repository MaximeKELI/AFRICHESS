"""Tests d'intégration Stockfish (sautés si moteur absent)."""
import shutil
import unittest

from django.conf import settings
from django.test import TestCase

from apps.games.engine import ChessEngineService
from apps.games.elo_config import STOCKFISH_UCI_MAX_ELO

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def stockfish_available() -> bool:
    return bool(settings.STOCKFISH_PATH and shutil.which(settings.STOCKFISH_PATH))


@unittest.skipUnless(stockfish_available(), "Stockfish non installé")
class StockfishStrengthIntegrationTests(TestCase):
    """Vérifie que le moteur répond et respecte la config UCI."""

    def test_get_best_move_beginner_returns_legal_move(self):
        svc = ChessEngineService()
        move = svc.get_best_move(START, difficulty=3, target_elo=800)
        self.assertIsNotNone(move)
        self.assertTrue(svc.is_legal_move(START, move.uci))

    def test_get_best_move_monster_returns_legal_move(self):
        svc = ChessEngineService()
        move = svc.get_best_move(START, difficulty=20, target_elo=5000)
        self.assertIsNotNone(move)
        self.assertTrue(svc.is_legal_move(START, move.uci))

    def test_analyze_position_returns_number(self):
        svc = ChessEngineService()
        ev = svc.analyze_position(START, depth=8)
        self.assertIsNotNone(ev)
        self.assertIsInstance(ev, (int, float))

    def test_limit_monster_deeper_than_club(self):
        svc = ChessEngineService()
        import chess.engine

        monster = svc._limit_for_elo(5000, 20)
        club = svc._limit_for_elo(1200, 6)
        self.assertGreater(
            monster.depth or 0,
            club.depth or 0,
        )
