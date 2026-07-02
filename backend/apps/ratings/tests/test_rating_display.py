"""Tests affichage Glicko-2."""

from django.test import TestCase, override_settings

from apps.ratings.display import format_rating_display


class RatingDisplayTests(TestCase):
    @override_settings(USE_GLICKO2=False)
    def test_elo_provisional(self):
        self.assertEqual(format_rating_display(1200, 350, 2), "1200?")

    @override_settings(USE_GLICKO2=True)
    def test_glicko_established(self):
        self.assertEqual(format_rating_display(1847, 42, 20), "1847 ± 42")

    @override_settings(USE_GLICKO2=True)
    def test_glicko_high_rd_provisional_style(self):
        self.assertEqual(format_rating_display(1500, 200, 10), "1500?")
