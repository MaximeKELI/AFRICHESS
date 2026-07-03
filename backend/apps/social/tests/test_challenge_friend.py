from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.models import Game
from apps.social.models import Friendship

User = get_user_model()


class ChallengeFriendViewTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="cf_a", password="x")
        self.b = User.objects.create_user(username="cf_b", password="x")
        Friendship.objects.create(
            from_user=self.a, to_user=self.b, status=Friendship.Status.ACCEPTED
        )
        self.client = APIClient()
        self.client.force_authenticate(self.a)

    def test_challenge_friend_with_time_control(self):
        res = self.client.post(
            "/api/social/friends/challenge/",
            {
                "username": self.b.username,
                "mode": "rapid",
                "time_control": "30+0",
                "is_timed": True,
                "is_rated": False,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        game = Game.objects.get(id=res.data["id"])
        self.assertEqual(game.white_time_ms, 1_800_000)
        self.assertEqual(game.increment_ms, 0)

    def test_challenge_friend_defaults_mode_time(self):
        res = self.client.post(
            "/api/social/friends/challenge/",
            {"username": self.b.username, "mode": "blitz", "is_rated": False},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        game = Game.objects.get(id=res.data["id"])
        self.assertEqual(game.white_time_ms, 180_000)
        self.assertEqual(game.increment_ms, 2_000)
