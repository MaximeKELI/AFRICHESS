"""Tests calibration anti-triche — baseline multi-parties et joueurs forts."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.fairplay_service import build_game_input, player_baseline, persist_fairplay_report
from apps.games.models import FairPlayReport, Game, Move
from apps.games.tests.fairplay_helpers import (
    alternating_moves,
    base_payload,
    baseline_payload,
    cpp_available,
    run_fairplay_cpp,
)

User = get_user_model()


class PlayerBaselineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="strong_player", password="x")
        self.opponent = User.objects.create_user(username="opp", password="x")

    def _game_with_report(self, top1: float, accuracy: float, cpl: float, score: float = 10.0):
        g = Game.objects.create(
            white_player=self.user,
            black_player=self.opponent,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )
        persist_fairplay_report(
            g,
            self.user,
            {
                "overall_score": score,
                "verdict": "clean",
                "signals": [],
                "move_evals": [],
                "engine_top1_rate": top1,
                "engine_top3_rate": top1 + 0.1,
                "avg_centipawn_loss": cpl,
                "accuracy_estimate": accuracy,
            },
        )
        return g

    def test_baseline_requires_five_games(self):
        for _ in range(4):
            self._game_with_report(0.45, 88.0, 35.0)
        base = player_baseline(self.user, Game(mode=Game.Mode.BLITZ))
        self.assertEqual(base["games_analyzed"], 4)
        self.assertEqual(base["avg_top1_rate"], 0.0)

    def test_baseline_averages_after_five_games(self):
        for _ in range(6):
            self._game_with_report(0.50, 90.0, 30.0)
        base = player_baseline(self.user, Game(mode=Game.Mode.BLITZ))
        self.assertEqual(base["games_analyzed"], 6)
        self.assertAlmostEqual(base["avg_top1_rate"], 0.50, places=2)
        self.assertAlmostEqual(base["avg_accuracy"], 90.0, places=1)

    def test_build_game_input_includes_baseline(self):
        for _ in range(5):
            self._game_with_report(0.48, 89.0, 32.0)
        game = Game.objects.create(
            white_player=self.user,
            black_player=self.opponent,
            status=Game.Status.ACTIVE,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )
        Move.objects.create(
            game=game,
            move_number=1,
            san="e4",
            uci="e2e4",
            fen_after=game.fen,
            played_by_white=True,
        )
        payload = build_game_input(game, self.user)
        self.assertEqual(payload["baseline"]["games_analyzed"], 5)
        self.assertAlmostEqual(payload["baseline"]["avg_top1_rate"], 0.48, places=2)


class StrongPlayerCalibrationTests(TestCase):
    def _run_cpp(self, payload: dict) -> dict:
        if not cpp_available():
            self.skipTest("fairplay binary not built")
        return run_fairplay_cpp(payload)

    def _make_moves(self, n: int) -> list[dict]:
        return alternating_moves(n // 2)[:n]

    def test_strong_player_with_baseline_stays_clean(self):
        all_moves = alternating_moves(24, white_think_ms=3200, black_think_ms=3000)
        payload = base_payload(
            game_id="calibration",
            player_elo=2400,
            baseline=baseline_payload(games=12, top1=0.52, accuracy=91.0, cpl=28.0),
            moves=all_moves,
        )
        result = self._run_cpp(payload)
        self.assertIn(result["verdict"], ("clean", "review"))

    def test_short_game_no_engine_verdict(self):
        payload = base_payload(
            game_id="short",
            player_elo=1400,
            moves=self._make_moves(8),
        )
        result = self._run_cpp(payload)
        self.assertEqual(result["verdict"], "clean")
