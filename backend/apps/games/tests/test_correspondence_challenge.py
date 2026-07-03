from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.social.models import Friendship

User = get_user_model()


class CorrespondenceChallengeTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="corr_a", password="x")
        self.b = User.objects.create_user(username="corr_b", password="x")
        Friendship.objects.create(
            from_user=self.a, to_user=self.b, status=Friendship.Status.ACCEPTED
        )
        self.client = APIClient()
        self.client.force_authenticate(self.a)

    def test_challenge_friend_creates_correspondence_game(self):
        res = self.client.post(
            "/api/games/correspondence/challenge/",
            {"username": self.b.username, "days_per_move": 3},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertIn("id", res.data)
