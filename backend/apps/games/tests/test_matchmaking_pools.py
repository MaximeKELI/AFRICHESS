"""Tests fourchette ELO matchmaking — plafond fixe 200."""

from django.test import TestCase, override_settings

from apps.games.matchmaking_pools import elo_range_for_wait


@override_settings(
    MATCHMAKING_ELO_RANGE=200,
    MATCHMAKING_POOL_MAX_RANGE=200,
)
class EloRangeForWaitTests(TestCase):
    def test_base_range_is_200(self):
        self.assertEqual(elo_range_for_wait(0), 200)

    def test_wait_does_not_expand_beyond_200(self):
        """Même après une longue attente, |ΔELO| max reste 200."""
        self.assertEqual(elo_range_for_wait(3), 200)
        self.assertEqual(elo_range_for_wait(9), 200)
        self.assertEqual(elo_range_for_wait(999), 200)

    def test_custom_base_capped_by_max(self):
        self.assertEqual(elo_range_for_wait(0, base=150), 150)
        with override_settings(MATCHMAKING_POOL_MAX_RANGE=100):
            self.assertEqual(elo_range_for_wait(0, base=200), 100)
