"""Progression bots niveau par niveau (style Chess.com)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.bot_progress import is_bot_unlocked, ladder_payload, max_beaten_elo, record_bot_victory
from apps.games.bot_tiers import START_UNLOCK_ELO, unlock_ceiling
from apps.games.models import BotVictory, ChessBot, Game

User = get_user_model()


def _bot(**kwargs) -> ChessBot:
    defaults = {
        "slug": "test-bot",
        "name": "Test Bot",
        "name_en": "Test Bot",
        "elo": 600,
        "tier": "novice",
        "is_premium": False,
        "is_active": True,
    }
    defaults.update(kwargs)
    return ChessBot.objects.create(**defaults)


class BotLadderUnlockTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ladder_u", password="x")
        self.weak = _bot(slug="weak-bot", elo=500, tier="beginner")
        self.mid = _bot(slug="mid-bot", elo=900, tier="novice")
        self.strong = _bot(slug="strong-bot", elo=1200, tier="intermediate")
        self.legend = _bot(slug="legend-bot", elo=2500, tier="master", is_premium=True)

    def test_start_ceiling_unlocks_beginners(self):
        self.assertEqual(unlock_ceiling(0), START_UNLOCK_ELO)
        self.assertTrue(is_bot_unlocked(self.user, self.weak))
        self.assertFalse(is_bot_unlocked(self.user, self.mid))
        self.assertFalse(is_bot_unlocked(self.user, self.strong))

    def test_beating_raises_ceiling(self):
        # Plafond de départ = max(800, beaten+150) — battre 500 ne change rien
        BotVictory.objects.create(user=self.user, bot=self.weak, bot_elo=self.weak.elo)
        self.assertEqual(max_beaten_elo(self.user), 500)
        self.assertEqual(unlock_ceiling(500), START_UNLOCK_ELO)
        self.assertFalse(is_bot_unlocked(self.user, self.mid))

        # Battre 900 → plafond 1050 → mid débloqué, strong (1200) encore verrouillé
        BotVictory.objects.create(user=self.user, bot=self.mid, bot_elo=self.mid.elo)
        self.assertEqual(unlock_ceiling(900), 1050)
        self.assertTrue(is_bot_unlocked(self.user, self.mid))
        self.assertFalse(is_bot_unlocked(self.user, self.strong))

        higher = _bot(slug="higher-bot", elo=1050, tier="intermediate")
        BotVictory.objects.create(user=self.user, bot=higher, bot_elo=1050)
        self.assertEqual(unlock_ceiling(1050), 1200)
        self.assertTrue(is_bot_unlocked(self.user, self.strong))

    def test_premium_bot_requires_subscription(self):
        # Elo assez haut pour le plafond, mais premium toujours requis
        BotVictory.objects.create(user=self.user, bot=self.strong, bot_elo=2400)
        self.assertFalse(is_bot_unlocked(self.user, self.legend))
        self.user.subscription_tier = User.SubscriptionTier.GOLD
        self.user.save(update_fields=["subscription_tier"])
        self.assertTrue(is_bot_unlocked(self.user, self.legend))

    def test_record_bot_victory_on_human_win(self):
        game = Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            bot=self.weak,
            mode=Game.Mode.BLITZ,
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
        )
        victory = record_bot_victory(game)
        self.assertIsNotNone(victory)
        self.assertEqual(BotVictory.objects.filter(user=self.user, bot=self.weak).count(), 1)

    def test_record_bot_victory_skips_loss(self):
        game = Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            bot=self.weak,
            mode=Game.Mode.BLITZ,
            status=Game.Status.COMPLETED,
            result=Game.Result.BLACK_WIN,
        )
        self.assertIsNone(record_bot_victory(game))
        self.assertEqual(BotVictory.objects.count(), 0)

    def test_ladder_payload_structure(self):
        BotVictory.objects.create(user=self.user, bot=self.weak, bot_elo=self.weak.elo)
        payload = ladder_payload(self.user, locale="en")
        self.assertIn("tiers", payload)
        self.assertEqual(payload["unlock_ceiling"], START_UNLOCK_ELO)
        self.assertEqual(payload["total_beaten"], 1)
        beginner = next(t for t in payload["tiers"] if t["id"] == "beginner")
        weak_item = next(b for b in beginner["bots"] if b["slug"] == "weak-bot")
        self.assertTrue(weak_item["beaten"])
        self.assertTrue(weak_item["unlocked"])


class BotLadderApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="ladder_api", password="x")
        self.weak = _bot(slug="api-weak", elo=400, tier="beginner")
        self.locked = _bot(slug="api-locked", elo=1500, tier="club")

    def test_ladder_endpoint_anonymous(self):
        res = self.client.get("/api/games/bots/ladder/?lang=en")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["unlock_ceiling"], START_UNLOCK_ELO)
        self.assertGreaterEqual(len(res.data["tiers"]), 8)

    def test_create_ai_rejects_locked_bot(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/games/ai/",
            {"mode": "blitz", "color": "white", "bot_slug": "api-locked"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data.get("code"), "bot_locked")

    def test_create_ai_allows_unlocked_bot(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/games/ai/",
            {"mode": "blitz", "color": "white", "bot_slug": "api-weak"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data.get("is_vs_ai"))
