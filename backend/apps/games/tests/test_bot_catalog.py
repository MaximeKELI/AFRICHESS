"""Tests catalogue bots — 100 profils uniques, légendes ELO élevé."""

from django.core.management import call_command
from django.test import TestCase

from apps.games.bot_catalog import BOT_CATALOG, LEGENDS
from apps.games.models import ChessBot


class BotCatalogTests(TestCase):
    def test_catalog_has_100_unique_slugs(self):
        slugs = [b["slug"] for b in BOT_CATALOG]
        self.assertEqual(len(slugs), 100)
        self.assertEqual(len(set(slugs)), 100)

    def test_legends_are_high_elo(self):
        self.assertGreaterEqual(len(LEGENDS), 25)
        for spec in LEGENDS:
            self.assertGreaterEqual(spec["elo"], 2440)
            self.assertTrue(spec["is_legend"])

    def test_fictional_are_lower_elo(self):
        fictional = [b for b in BOT_CATALOG if not b["is_legend"]]
        self.assertEqual(len(fictional), 100 - len(LEGENDS))
        for spec in fictional:
            self.assertLess(spec["elo"], 2400)

    def test_seed_bots_command(self):
        call_command("seed_bots", "--deactivate-old")
        self.assertEqual(ChessBot.objects.filter(is_active=True).count(), 100)
        magnus = ChessBot.objects.get(slug="magnus-carlsen")
        self.assertEqual(magnus.elo, 3200)
        self.assertEqual(magnus.avatar_id, "magnus-carlsen")
        self.assertEqual(magnus.tier, "elite")
        beginner = ChessBot.objects.filter(tier="beginner", is_active=True).count()
        self.assertGreater(beginner, 0)
