"""Tests ajustement ELO IA selon historique et classement joueur."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.games.elo_adapt import adapt_ai_elo_from_history, resolve_final_ai_elo
from apps.games.elo_config import normalize_to_preset_elo, suggested_ai_elo_for_user
from apps.games.models import Game
from apps.ratings.models import PlayerRating

User = get_user_model()


class NormalizePresetTests(TestCase):
    def test_range_mapping(self):
        self.assertEqual(normalize_to_preset_elo(300), 250)
        self.assertEqual(normalize_to_preset_elo(800), 750)
        self.assertEqual(normalize_to_preset_elo(1200), 1250)
        self.assertEqual(normalize_to_preset_elo(2000), 2250)
        self.assertEqual(normalize_to_preset_elo(3600), 4000)


class SuggestedAiEloTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="elo_user",
            email="elo@test.com",
            password="pass",
            chess_level="intermediate",
        )
        PlayerRating.objects.create(user=self.user, mode="blitz", elo=1850)

    def test_suggested_from_player_rating_not_profile_only(self):
        self.assertEqual(suggested_ai_elo_for_user(self.user, "blitz"), 1750)


class AdaptHistoryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="adapt_user",
            email="adapt@test.com",
            password="pass",
        )

    def _ai_game(self, result):
        return Game.objects.create(
            white_player=self.user,
            is_vs_ai=True,
            mode=Game.Mode.AI,
            status=Game.Status.COMPLETED,
            result=result,
            ended_at=timezone.now(),
        )

    def test_wins_increase_suggested_elo(self):
        for _ in range(3):
            self._ai_game(Game.Result.WHITE_WIN)
        adapted = adapt_ai_elo_from_history(self.user, 1250)
        self.assertEqual(adapted, 1250 + 3 * 80)

    def test_losses_decrease_suggested_elo(self):
        for _ in range(2):
            self._ai_game(Game.Result.BLACK_WIN)
        adapted = adapt_ai_elo_from_history(self.user, 1250)
        self.assertEqual(adapted, 1250 - 2 * 60)

    def test_create_matches_preview_with_adaptation(self):
        self._ai_game(Game.Result.WHITE_WIN)
        final = resolve_final_ai_elo(self.user, mode="blitz", ai_elo=1250)
        self.assertEqual(final, 1330)
