"""Tests pools matchmaking — élargissement ELO."""

from django.test import TestCase, override_settings

from apps.games.matchmaking_pools import elo_range_for_wait


@override_settings(
    MATCHMAKING_ELO_RANGE=200,
    MATCHMAKING_POOL_EXPAND_STEP=50,
    MATCHMAKING_POOL_EXPAND_SECONDS=3,
    MATCHMAKING_POOL_MAX_RANGE=500,
)
class EloRangeForWaitTests(TestCase):
    def test_base_range_at_zero(self):
        self.assertEqual(elo_range_for_wait(0), 200)

    def test_expands_every_3_seconds(self):
        self.assertEqual(elo_range_for_wait(3), 250)
        self.assertEqual(elo_range_for_wait(9), 350)

    def test_respects_max(self):
        self.assertEqual(elo_range_for_wait(999, base=200), 500)
