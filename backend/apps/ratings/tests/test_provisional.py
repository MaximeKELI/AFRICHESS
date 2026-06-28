"""Tests classement provisoire (5 parties en ligne)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.ratings.constants import PROVISIONAL_GAMES_REQUIRED
from apps.ratings.models import PlayerRating
from apps.ratings.provisional import is_provisional, player_rating_info
from apps.users.setup import setup_new_user

User = get_user_model()


class ProvisionalRatingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="prov_user",
            password="x",
            chess_level="intermediate",
        )
        setup_new_user(self.user)

    def test_initial_elo_from_chess_level(self):
        info = player_rating_info(self.user, "blitz")
        self.assertEqual(info["elo"], 1200)
        self.assertTrue(info["is_provisional"])
        self.assertEqual(info["games_until_established"], PROVISIONAL_GAMES_REQUIRED)

    def test_established_after_five_games(self):
        rating = PlayerRating.objects.get(user=self.user, mode="blitz")
        rating.games_count = PROVISIONAL_GAMES_REQUIRED
        rating.save(update_fields=["games_count"])
        self.assertFalse(is_provisional(rating))

    def test_leaderboard_excludes_provisional(self):
        client = APIClient()
        res = client.get("/api/ratings/leaderboard/global/?mode=blitz")
        self.assertEqual(res.status_code, 200)
        rows = res.data.get("results", res.data)
        usernames = [r["user"]["username"] for r in rows]
        self.assertNotIn("prov_user", usernames)

    def test_leaderboard_includes_established(self):
        rating = PlayerRating.objects.get(user=self.user, mode="blitz")
        rating.games_count = PROVISIONAL_GAMES_REQUIRED
        rating.save(update_fields=["games_count"])
        client = APIClient()
        res = client.get("/api/ratings/leaderboard/global/?mode=blitz")
        rows = res.data.get("results", res.data)
        usernames = [r["user"]["username"] for r in rows]
        self.assertIn("prov_user", usernames)

    def test_my_ratings_includes_provisional_flag(self):
        client = APIClient()
        client.force_authenticate(self.user)
        res = client.get("/api/ratings/me/")
        self.assertEqual(res.status_code, 200)
        rows = res.data.get("results", res.data)
        blitz = next(r for r in rows if r["mode"] == "blitz")
        self.assertTrue(blitz["is_provisional"])
        self.assertEqual(blitz["games_until_established"], PROVISIONAL_GAMES_REQUIRED)
