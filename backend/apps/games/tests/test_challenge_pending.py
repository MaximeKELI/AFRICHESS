"""Défis avec acceptation obligatoire."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.models import Game, GameChallenge
from apps.notifications.models import Notification
from apps.social.models import Friendship

User = get_user_model()


class GameChallengeFlowTests(TestCase):
    def setUp(self):
        self.challenger = User.objects.create_user(username="gc_a", password="x")
        self.opponent = User.objects.create_user(username="gc_b", password="x")
        self.client = APIClient()

    def test_challenge_creates_pending_invite_not_game(self):
        self.client.force_authenticate(self.challenger)
        res = self.client.post(
            "/api/games/challenge/",
            {"username": self.opponent.username, "mode": "blitz", "is_rated": False},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["status"], "pending")
        self.assertEqual(Game.objects.count(), 0)
        self.assertEqual(GameChallenge.objects.count(), 1)
        notif = Notification.objects.get(user=self.opponent, type=Notification.Type.GAME_INVITE)
        self.assertEqual(notif.data.get("challenge_id"), res.data["id"])
        self.assertNotIn("game_id", notif.data)

    def test_accept_challenge_creates_game(self):
        self.client.force_authenticate(self.challenger)
        create = self.client.post(
            "/api/games/challenge/",
            {"username": self.opponent.username, "mode": "blitz", "is_rated": False},
            format="json",
        )
        challenge_id = create.data["id"]
        self.client.force_authenticate(self.opponent)
        res = self.client.post(f"/api/games/challenges/{challenge_id}/accept/", {}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(Game.objects.count(), 1)
        game = Game.objects.get()
        self.assertEqual(res.data["game"]["id"], str(game.id))
        challenge = GameChallenge.objects.get(pk=challenge_id)
        self.assertEqual(challenge.status, GameChallenge.Status.ACCEPTED)
        self.assertEqual(challenge.game_id, game.id)
        challenger_notif = Notification.objects.get(
            user=self.challenger, type=Notification.Type.MATCH_FOUND
        )
        self.assertEqual(challenger_notif.data.get("game_id"), str(game.id))
        self.assertEqual(challenger_notif.data.get("action"), "challenge_accepted")
        acceptor_notif = Notification.objects.get(
            user=self.opponent, type=Notification.Type.MATCH_FOUND
        )
        self.assertEqual(acceptor_notif.data.get("game_id"), str(game.id))

    def test_decline_challenge_does_not_create_game(self):
        self.client.force_authenticate(self.challenger)
        create = self.client.post(
            "/api/games/challenge/",
            {"username": self.opponent.username, "mode": "rapid", "is_rated": False},
            format="json",
        )
        challenge_id = create.data["id"]
        self.client.force_authenticate(self.opponent)
        res = self.client.post(f"/api/games/challenges/{challenge_id}/decline/", {}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(Game.objects.count(), 0)
        challenge = GameChallenge.objects.get(pk=challenge_id)
        self.assertEqual(challenge.status, GameChallenge.Status.DECLINED)
        self.assertTrue(
            Notification.objects.filter(
                user=self.challenger, type=Notification.Type.SYSTEM
            ).exists()
        )


class ChallengeFriendPendingTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="cf2_a", password="x")
        self.b = User.objects.create_user(username="cf2_b", password="x")
        Friendship.objects.create(from_user=self.a, to_user=self.b, status=Friendship.Status.ACCEPTED)
        self.client = APIClient()
        self.client.force_authenticate(self.a)

    def test_friend_challenge_with_time_control_pending(self):
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
