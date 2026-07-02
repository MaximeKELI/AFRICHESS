"""Tests Glicko-2 rating."""

from django.test import TestCase

from apps.ratings.glicko2 import Glicko2State, display_rating, rate_period


class Glicko2Tests(TestCase):
    def test_equal_players_draw(self):
        a = Glicko2State(1500, 350, 0.06)
        b = Glicko2State(1500, 350, 0.06)
        a_new = rate_period(a, [b], [0.5])
        self.assertAlmostEqual(display_rating(a_new), 1500, delta=25)

    def test_underdog_win_gains_more(self):
        low = Glicko2State(1200, 80, 0.06)
        high = Glicko2State(1800, 80, 0.06)
        low_new = rate_period(low, [high], [1.0])
        self.assertGreater(display_rating(low_new), 1200)
