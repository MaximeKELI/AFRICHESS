from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.models import Game, GameChallenge
from apps.notifications.models import Notification
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
        self.assertEqual(Game.objects.count(), 0)
        challenge = GameChallenge.objects.get(pk=res.data["id"])
        self.assertEqual(challenge.time_control, "30+0")

    def test_challenge_friend_defaults_mode_time(self):
        res = self.client.post(
            "/api/social/friends/challenge/",
            {"username": self.b.username, "mode": "blitz", "is_rated": False},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        challenge = GameChallenge.objects.get(pk=res.data["id"])
        self.assertEqual(challenge.time_control, "3+2")

    def test_challenge_friend_notification_includes_challenge_id(self):
        res = self.client.post(
            "/api/social/friends/challenge/",
            {"username": self.b.username, "mode": "blitz", "is_rated": False},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        notif = Notification.objects.filter(
            user=self.b, type=Notification.Type.GAME_INVITE
        ).latest("created_at")
        self.assertEqual(notif.data.get("from_username"), self.a.username)
        self.assertEqual(notif.data.get("challenge_id"), res.data["id"])
        self.assertNotIn("game_id", notif.data)

    def test_accept_friend_challenge_starts_game(self):
        res = self.client.post(
            "/api/social/friends/challenge/",
            {"username": self.b.username, "mode": "blitz", "is_rated": False},
            format="json",
        )
        self.client.force_authenticate(self.b)
        accept = self.client.post(f"/api/games/challenges/{res.data['id']}/accept/", {}, format="json")
        self.assertEqual(accept.status_code, 200, accept.data)
        game = Game.objects.get(id=accept.data["game"]["id"])
        self.assertEqual(game.white_time_ms, 180_000)
        self.assertEqual(game.increment_ms, 2_000)
        self.assertTrue(
            Notification.objects.filter(
                user=self.a, type=Notification.Type.MATCH_FOUND
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=self.b, type=Notification.Type.MATCH_FOUND
            ).exists()
        )
