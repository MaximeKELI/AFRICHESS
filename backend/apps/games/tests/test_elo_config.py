"""Tests configuration ELO IA (100–5000)."""
from django.test import SimpleTestCase

from apps.games.elo_config import (
    MAX_AI_ELO,
    MIN_AI_ELO,
    STOCKFISH_UCI_MAX_ELO,
    clamp_elo,
    difficulty_slider_to_elo,
    elo_strength_label,
    elo_to_difficulty_slider,
    resolve_ai_target_elo,
)


class ClampEloTests(SimpleTestCase):
    def test_min_max_bounds(self):
        self.assertEqual(clamp_elo(100), MIN_AI_ELO)
        self.assertEqual(clamp_elo(99999), MAX_AI_ELO)
        self.assertEqual(clamp_elo(2400), 2400)

    def test_preset_levels(self):
        for elo in (100, 250, 800, 1200, 2000, 3200, 4500, 5000):
            self.assertEqual(clamp_elo(elo), elo)


class DifficultySliderTests(SimpleTestCase):
    def test_slider_1_is_100(self):
        self.assertEqual(difficulty_slider_to_elo(1), 100)

    def test_slider_20_is_5000(self):
        self.assertEqual(difficulty_slider_to_elo(20), 5000)

    def test_round_trip_slider_extremes(self):
        self.assertEqual(difficulty_slider_to_elo(elo_to_difficulty_slider(100)), 100)
        self.assertEqual(difficulty_slider_to_elo(elo_to_difficulty_slider(5000)), 5000)

    def test_presets_map_to_valid_slider(self):
        for elo in (800, 1200, 1600, 2000, 2400, 2800, 3200, 3800, 4500, 5000):
            back = difficulty_slider_to_elo(elo_to_difficulty_slider(elo))
            self.assertGreaterEqual(back, MIN_AI_ELO)
            self.assertLessEqual(back, MAX_AI_ELO)


class ResolveAiTargetEloTests(SimpleTestCase):
    def test_ai_elo_direct_choice(self):
        class FakeUser:
            chess_level = "beginner"
            initial_elo = 800

        user = FakeUser()
        self.assertEqual(resolve_ai_target_elo(user, ai_elo=5000), 5000)
        self.assertEqual(resolve_ai_target_elo(user, ai_elo=800), 800)
        self.assertEqual(resolve_ai_target_elo(user, ai_elo=3200), 3200)

    def test_ai_elo_priority_over_difficulty(self):
        class FakeUser:
            chess_level = "master"
            initial_elo = 2200

        user = FakeUser()
        from_slider = resolve_ai_target_elo(user, difficulty=1)
        from_elo = resolve_ai_target_elo(user, ai_elo=5000, difficulty=1)
        self.assertEqual(from_elo, 5000)
        self.assertEqual(from_slider, 100)

    def test_difficulty_slider_maps_to_elo(self):
        class FakeUser:
            chess_level = "intermediate"
            initial_elo = 1200

        self.assertEqual(
            resolve_ai_target_elo(FakeUser(), difficulty=20),
            5000,
        )


class EloLabelsTests(SimpleTestCase):
    def test_monster_label(self):
        self.assertIn("Monstre", elo_strength_label(5000))

    def test_beginner_label(self):
        self.assertEqual(elo_strength_label(250), "Débutant (0–500)")
        self.assertEqual(elo_strength_label(800), "Novice (500–1000)")


class StockfishUciCapTests(SimpleTestCase):
    def test_uci_max_is_below_app_max(self):
        self.assertLess(STOCKFISH_UCI_MAX_ELO, MAX_AI_ELO)
