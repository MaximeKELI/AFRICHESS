"""Tests événements club."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.social.models import Club, ClubEvent, ClubMembership

User = get_user_model()


class ClubEventTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="club_owner", password="x")
        self.member = User.objects.create_user(username="club_mem", password="x")
        self.club = Club.objects.create(name="Test Club", slug="test-club", owner=self.owner)
        ClubMembership.objects.create(club=self.club, user=self.owner, role=ClubMembership.Role.OWNER)
        ClubMembership.objects.create(club=self.club, user=self.member, role=ClubMembership.Role.MEMBER)
        self.client = APIClient()

    def test_list_club_events(self):
        ClubEvent.objects.create(
            club=self.club,
            title="Tournoi interne",
            event_type=ClubEvent.EventType.TOURNAMENT,
            created_by=self.owner,
        )
        res = self.client.get(f"/api/social/clubs/{self.club.slug}/events/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["title"], "Tournoi interne")

    def test_create_event_requires_auth(self):
        res = self.client.post(
            f"/api/social/clubs/{self.club.slug}/events/",
            {"title": "New", "event_type": "tournament"},
            format="json",
        )
        self.assertEqual(res.status_code, 401)

    def test_owner_can_create_event(self):
        self.client.force_authenticate(self.owner)
        res = self.client.post(
            f"/api/social/clubs/{self.club.slug}/events/",
            {"title": "Blitz night", "event_type": "tournament"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["title"], "Blitz night")
