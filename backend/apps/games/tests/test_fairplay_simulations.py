"""
Simulations approfondies du moteur C++ Fair Play.

Couvre : joueurs propres, forts avec baseline, patterns bot, télémétrie,
exigence multi-signaux pour likely_cheat, modes bullet vs blitz.
"""

from django.test import TestCase

from apps.games.tests.fairplay_helpers import (
    alternating_moves,
    base_payload,
    baseline_payload,
    cpp_available,
    run_fairplay_cpp,
    signal_codes,
)


class FairPlaySimulationTests(TestCase):
    """Matrice de scénarios realtime (sans Stockfish — rapide et déterministe)."""

    def _run(self, payload: dict) -> dict:
        if not cpp_available():
            self.skipTest("fairplay binary not built")
        return run_fairplay_cpp(payload)

    def test_sim_clean_casual_blitz(self):
        result = self._run(
            base_payload(
                player_elo=1200,
                moves=alternating_moves(15, white_think_ms=2800, black_think_ms=2600),
            )
        )
        self.assertEqual(result["verdict"], "clean")
        self.assertEqual(result["overall_score"], 0.0)
        self.assertEqual(len(result["signals"]), 0)

    def test_sim_strong_player_with_baseline_stays_clean(self):
        result = self._run(
            base_payload(
                player_elo=2500,
                baseline=baseline_payload(games=15, top1=0.55, accuracy=92.0, cpl=25.0),
                moves=alternating_moves(20, white_think_ms=3200, black_think_ms=3000),
            )
        )
        self.assertIn(result["verdict"], ("clean", "review"))
        self.assertNotEqual(result["verdict"], "likely_cheat")

    def test_sim_instant_complex_positions(self):
        moves = alternating_moves(
            8,
            white_think_ms=120,
            black_think_ms=2500,
            white_complexity=350,
            black_complexity=60,
        )
        result = self._run(base_payload(player_elo=1100, moves=moves))
        codes = signal_codes(result)
        self.assertIn("INSTANT_COMPLEX", codes)

    def test_sim_critical_instant_moves(self):
        moves = []
        for i in range(6):
            moves.append(
                {
                    "uci": "e2e4" if i % 2 == 0 else "e7e5",
                    "san": "e4" if i % 2 == 0 else "e5",
                    "played_by_white": i % 2 == 0,
                    "move_number": i + 1,
                    "think_ms": 80 if i % 2 == 0 else 2000,
                    "complexity_cp": 500 if i % 2 == 0 else 50,
                }
            )
        result = self._run(base_payload(player_elo=1000, moves=moves))
        self.assertIn("CRITICAL_INSTANT", signal_codes(result))

    def test_sim_robotic_uniform_timing(self):
        moves = alternating_moves(12, white_think_ms=2100, black_think_ms=2100)
        result = self._run(
            base_payload(
                player_elo=1300,
                mode="rapid",
                moves=moves,
            )
        )
        self.assertIn("TIMING_ROBOTIC", signal_codes(result))

    def test_sim_bullet_allows_fast_moves(self):
        moves = alternating_moves(20, white_think_ms=40, black_think_ms=40)
        result = self._run(
            base_payload(player_elo=1100, mode="bullet", moves=moves)
        )
        self.assertNotIn("MOVE_TOO_FAST", signal_codes(result))

    def test_sim_copy_paste_telemetry(self):
        result = self._run(
            base_payload(
                moves=alternating_moves(6),
                telemetry={"copy_paste_events": 4},
            )
        )
        self.assertIn("COPY_PASTE", signal_codes(result))

    def test_sim_devtools_telemetry(self):
        result = self._run(
            base_payload(
                moves=alternating_moves(6),
                telemetry={"devtools_open_count": 3},
            )
        )
        self.assertIn("DEVTOOLS", signal_codes(result))

    def test_sim_tab_blur_and_focus_loss(self):
        result = self._run(
            base_payload(
                moves=alternating_moves(8),
                telemetry={"tab_blur_count": 15, "focus_loss_ms": 200000},
            )
        )
        codes = signal_codes(result)
        self.assertIn("TAB_BLUR_SUSPECT", codes)
        self.assertIn("FOCUS_LOSS", codes)

    def test_sim_low_mouse_entropy(self):
        result = self._run(
            base_payload(
                moves=alternating_moves(8),
                telemetry={"mouse_entropy": 0.15},
            )
        )
        self.assertIn("LOW_MOUSE_ENTROPY", signal_codes(result))

    def test_sim_single_signal_never_likely_cheat(self):
        """Un seul signal faible ne doit pas suffire pour likely_cheat."""
        result = self._run(
            base_payload(
                moves=alternating_moves(6),
                telemetry={"tab_blur_count": 12},
            )
        )
        self.assertNotEqual(result["verdict"], "likely_cheat")

    def test_sim_combined_bot_pattern_elevated_verdict(self):
        """Combinaison timing + télémétrie → verdict au moins review."""
        moves = alternating_moves(
            10,
            white_think_ms=100,
            white_complexity=320,
            black_think_ms=2500,
        )
        result = self._run(
            base_payload(
                player_elo=900,
                moves=moves,
                telemetry={"copy_paste_events": 5, "devtools_open_count": 2},
            )
        )
        self.assertIn(result["verdict"], ("review", "suspicious", "likely_cheat"))
        self.assertGreaterEqual(result["overall_score"], 35.0)
        self.assertGreaterEqual(len(result["signals"]), 2)

    def test_sim_realtime_skips_engine_signals(self):
        """Mode realtime : pas de signaux moteur même avec perf « parfaite » simulée."""
        result = self._run(
            base_payload(
                player_elo=800,
                analysis_mode="realtime",
                moves=alternating_moves(20),
            )
        )
        engine_codes = {
            "ENGINE_TOP1_HIGH",
            "ENGINE_TOP3_HIGH",
            "CPL_TOO_LOW",
            "ACCURACY_SPIKE",
            "OPENING_ENGINE",
            "PERFORMANCE_VS_ELO",
        }
        self.assertFalse(engine_codes & signal_codes(result))

    def test_sim_short_game_insufficient_sample(self):
        result = self._run(
            base_payload(
                player_elo=1400,
                analysis_mode="full",
                moves=alternating_moves(4),
            )
        )
        self.assertEqual(result["verdict"], "clean")


class FairPlaySimulationMatrixTests(TestCase):
    """Exécute une matrice de scénarios et vérifie les invariants globaux."""

    SCENARIOS = [
        ("casual_clean", {"player_elo": 1200, "moves": alternating_moves(12)}, "clean"),
        ("strong_baseline", {
            "player_elo": 2600,
            "baseline": baseline_payload(games=20, top1=0.58, accuracy=93.0),
            "moves": alternating_moves(18, white_think_ms=3500),
        }, ("clean", "review")),
        ("paste_heavy", {
            "telemetry": {"copy_paste_events": 6},
            "moves": alternating_moves(8),
        }, ("review", "suspicious", "likely_cheat")),
    ]

    def test_matrix_invariants(self):
        if not cpp_available():
            self.skipTest("fairplay binary not built")
        for name, kwargs, expected in self.SCENARIOS:
            with self.subTest(scenario=name):
                result = run_fairplay_cpp(base_payload(**kwargs))
                self.assertIn("verdict", result)
                self.assertIn("overall_score", result)
                self.assertIsInstance(result["signals"], list)
                if isinstance(expected, str):
                    self.assertEqual(result["verdict"], expected, msg=name)
                else:
                    self.assertIn(result["verdict"], expected, msg=name)
                if result["verdict"] == "likely_cheat":
                    self.assertGreaterEqual(len(result["signals"]), 2)
