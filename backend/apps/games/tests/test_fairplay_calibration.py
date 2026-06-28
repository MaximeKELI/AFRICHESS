"""Tests calibration anti-triche — baseline multi-parties et joueurs forts."""

import json
import shutil
import subprocess

from django.contrib.auth import get_user_model

from apps.games.fairplay_service import build_game_input, player_baseline, persist_fairplay_report
from apps.games.models import FairPlayReport, Game, Move

from django.test import TestCase

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
        binary = "/home/maxime/AFRICHESS/anticheat-cpp/build/africhess-fairplay"
        if not shutil.which(binary) and not __import__("os").path.isfile(binary):
            self.skipTest("fairplay binary not built")
        proc = subprocess.run(
            [binary],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        return json.loads(proc.stdout)

    def _make_moves(self, n: int, top1_ratio: float) -> list[dict]:
        moves = []
        for i in range(n):
            is_white = i % 2 == 0
            moves.append(
                {
                    "uci": "e2e4" if is_white else "e7e5",
                    "san": "e4" if is_white else "e5",
                    "played_by_white": is_white,
                    "move_number": i + 1,
                    "think_ms": 2500,
                    "complexity_cp": 80,
                }
            )
        return moves

    def test_strong_player_with_baseline_stays_clean(self):
        """Joueur 2400 avec historique cohérent — une bonne partie ne doit pas flagger."""
        player_moves = []
        for i in range(24):
            player_moves.append(
                {
                    "uci": "e2e4",
                    "san": "e4",
                    "played_by_white": True,
                    "move_number": i * 2 + 1,
                    "think_ms": 3000,
                    "complexity_cp": 60,
                }
            )
        all_moves = []
        for i in range(48):
            all_moves.append(
                {
                    "uci": "e2e4" if i % 2 == 0 else "e7e5",
                    "san": "e4" if i % 2 == 0 else "e5",
                    "played_by_white": i % 2 == 0,
                    "move_number": i + 1,
                    "think_ms": 2500,
                    "complexity_cp": 60,
                }
            )
        payload = {
            "game_id": "calibration",
            "player_elo": 2400,
            "player_is_white": True,
            "mode": "blitz",
            "analysis_mode": "realtime",
            "baseline": {
                "games_analyzed": 12,
                "avg_accuracy": 91.0,
                "avg_top1_rate": 0.52,
                "avg_cpl": 28.0,
                "avg_overall_score": 8.0,
            },
            "telemetry": {},
            "moves": all_moves,
        }
        result = self._run_cpp(payload)
        self.assertIn(result["verdict"], ("clean", "review"))

    def test_short_game_no_engine_verdict(self):
        payload = {
            "game_id": "short",
            "player_elo": 1400,
            "player_is_white": True,
            "mode": "blitz",
            "analysis_mode": "realtime",
            "baseline": {"games_analyzed": 0},
            "telemetry": {},
            "moves": self._make_moves(8, 0.5),
        }
        result = self._run_cpp(payload)
        self.assertEqual(result["verdict"], "clean")
