from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.social.models import Club, Friendship

User = get_user_model()


class SocialApiTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="soca", password="x")
        self.b = User.objects.create_user(username="socb", password="x")
        self.owner = User.objects.create_user(username="clubown", password="x")
        self.club = Club.objects.create(
            name="Test Club",
            slug="test-club",
            owner=self.owner,
            is_public=True,
        )
        self.client = APIClient()

    def test_friend_request_and_accept(self):
        self.client.force_authenticate(self.a)
        res = self.client.post(
            "/api/social/friends/request/",
            {"username": "socb"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        friendship = Friendship.objects.get(from_user=self.a, to_user=self.b)
        self.assertEqual(friendship.status, Friendship.Status.PENDING)

        self.client.force_authenticate(self.b)
        res2 = self.client.post(f"/api/social/friends/{friendship.pk}/accept/")
        self.assertEqual(res2.status_code, 200)
        friendship.refresh_from_db()
        self.assertEqual(friendship.status, Friendship.Status.ACCEPTED)

    def test_decline_friend_request(self):
        friendship = Friendship.objects.create(
            from_user=self.a, to_user=self.b, status=Friendship.Status.PENDING
        )
        self.client.force_authenticate(self.b)
        res = self.client.post(f"/api/social/friends/{friendship.pk}/decline/")
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Friendship.objects.filter(pk=friendship.pk).exists())

    def test_user_search(self):
        self.client.force_authenticate(self.a)
        res = self.client.get("/api/social/users/search/", {"q": "socb"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["user"]["username"], "socb")

        res_users = self.client.get("/api/users/search/", {"q": "socb"})
        self.assertEqual(res_users.status_code, 200)
        self.assertEqual(len(res_users.data), 1)

    def test_follow_user(self):
        self.client.force_authenticate(self.a)
        res = self.client.post("/api/social/users/socb/follow/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["is_following"])
        res2 = self.client.post("/api/social/users/socb/unfollow/")
        self.assertFalse(res2.data["is_following"])

    def test_join_public_club(self):
        self.client.force_authenticate(self.a)
        res = self.client.post("/api/social/clubs/test-club/join/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(self.club.members.filter(pk=self.a.pk).exists())
        self.club.refresh_from_db()
        self.assertEqual(self.club.member_count, 1)

    def test_create_club_without_slug(self):
        self.client.force_authenticate(self.a)
        res = self.client.post(
            "/api/social/clubs/",
            {"name": "Nouveau Club", "description": "Salut", "country": "FR"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["slug"])
        self.assertEqual(res.data["name"], "Nouveau Club")
