from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.ratings.models import PlayerRating

User = get_user_model()


class RatingsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="rated1", password="x")
        PlayerRating.objects.create(user=self.user, mode="blitz", elo=1350)

    def test_my_ratings_requires_auth(self):
        res = self.client.get("/api/ratings/me/")
        self.assertEqual(res.status_code, 401)

    def test_my_ratings_returns_elo(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/ratings/me/")
        self.assertEqual(res.status_code, 200)
        rows = res.data.get("results", res.data)
        self.assertEqual(rows[0]["elo"], 1350)

    def test_global_leaderboard_public(self):
        res = self.client.get("/api/ratings/leaderboard/global/")
        self.assertEqual(res.status_code, 200)
        rows = res.data.get("results", res.data)
        self.assertTrue(len(rows) >= 1)
