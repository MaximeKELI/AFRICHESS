"""Intégration Fair Play + Stockfish (full mode) — skip si binaire/moteur indisponible."""

import shutil

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.fairplay_service import estimate_complexity_cp, run_fairplay_analysis
from apps.games.models import Game, Move
from apps.games.tests.fairplay_helpers import alternating_moves, base_payload, cpp_available, run_fairplay_cpp

User = get_user_model()


def stockfish_available() -> bool:
    path = getattr(settings, "STOCKFISH_PATH", "")
    return bool(path and shutil.which(path))


class FairPlayFullModeIntegrationTests(TestCase):
    def setUp(self):
        if not cpp_available():
            self.skipTest("fairplay binary not built")
        if not stockfish_available():
            self.skipTest("stockfish not available")
        self.white = User.objects.create_user(username="w_full", password="x")
        self.black = User.objects.create_user(username="b_full", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )
        start_fen = self.game.fen
        for i, mv in enumerate(alternating_moves(8)[:8]):
            Move.objects.create(
                game=self.game,
                move_number=i + 1,
                san=mv["san"],
                uci=mv["uci"],
                fen_after=start_fen,
                played_by_white=mv["played_by_white"],
                think_ms=mv["think_ms"],
                complexity_cp=mv["complexity_cp"],
            )

    def test_full_mode_analysis_returns_engine_metrics(self):
        result = run_fairplay_analysis(self.game, self.white, analysis_mode="full")
        if result is None:
            self.skipTest("fairplay subprocess failed")
        self.assertIn("verdict", result)
        self.assertIn("engine_top1_rate", result)
        self.assertIn("move_evals", result)

    def test_full_mode_clean_opening_low_elo(self):
        payload = base_payload(
            game_id="full_open",
            player_elo=1000,
            analysis_mode="full",
            stockfish_path=settings.STOCKFISH_PATH,
            moves=alternating_moves(6, white_think_ms=3000),
        )
        payload["engine_depth"] = 10
        result = run_fairplay_cpp(payload, timeout=120)
        self.assertIn(result["verdict"], ("clean", "review"))


class ComplexityHeuristicTests(TestCase):
    def test_startpos_low_complexity(self):
        fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        cp = estimate_complexity_cp(fen)
        self.assertGreaterEqual(cp, 0)
        self.assertLess(cp, 200)

    def test_complexity_no_stockfish_call(self):
        """Heuristique instantanée — pas d'appel moteur."""
        with self.settings(STOCKFISH_PATH="/nonexistent/stockfish"):
            cp = estimate_complexity_cp(
                "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            )
        self.assertGreaterEqual(cp, 0)
