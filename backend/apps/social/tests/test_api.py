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

    def test_join_public_club(self):
        self.client.force_authenticate(self.a)
        res = self.client.post("/api/social/clubs/test-club/join/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(self.club.members.filter(pk=self.a.pk).exists())
        self.club.refresh_from_db()
        self.assertEqual(self.club.member_count, 1)
