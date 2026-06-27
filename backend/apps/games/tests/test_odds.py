"""Tests handicaps (odds chess)."""

from django.test import SimpleTestCase

from apps.games.odds import ODDS_PRESETS, fen_for_odds


class OddsPresetsTests(SimpleTestCase):
    def test_none_returns_none(self):
        self.assertIsNone(fen_for_odds("none"))

    def test_queen_has_fen(self):
        fen = fen_for_odds("queen")
        self.assertIsNotNone(fen)
        self.assertIn("rnb1kbnr", fen)

    def test_all_presets_defined(self):
        self.assertIn("knight", ODDS_PRESETS)
