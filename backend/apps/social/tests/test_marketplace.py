"""Tests marketplace coaches / streamers."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.social.models import CoachProfile, StreamerProfile

User = get_user_model()


class MarketplaceTests(TestCase):
    def setUp(self):
        self.coach_user = User.objects.create_user(username="coach1", password="x")
        self.client = APIClient()
        CoachProfile.objects.create(
            user=self.coach_user,
            bio="FM coach",
            hourly_rate_eur=30,
            is_available=True,
        )

    def test_coaches_public_list(self):
        res = self.client.get("/api/social/coaches/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(res.data) >= 1)
        self.assertEqual(res.data[0]["username"], "coach1")

    def test_streamers_public_list(self):
        StreamerProfile.objects.create(user=self.coach_user, display_name="ChessLive", is_live=True)
        res = self.client.get("/api/social/streamers/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(s["display_name"] == "ChessLive" for s in res.data))
