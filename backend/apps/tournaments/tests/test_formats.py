"""Tests formats tournoi avancés (daily, club arena)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.social.models import Club
from apps.tournaments.models import Tournament

User = get_user_model()


class TournamentFormatTests(TestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(username="t_fmt", password="x")
        self.club_a = Club.objects.create(name="Club A", slug="club-a", owner=self.organizer)
        self.club_b = Club.objects.create(name="Club B", slug="club-b", owner=self.organizer)
        self.client = APIClient()

    def test_daily_tournament_listed(self):
        Tournament.objects.create(
            name="Daily Blitz",
            slug="daily-blitz",
            format=Tournament.Format.DAILY,
            status=Tournament.Status.REGISTRATION,
            mode="daily",
            starts_at=timezone.now(),
            created_by=self.organizer,
            days_per_move=3,
        )
        res = self.client.get("/api/tournaments/")
        self.assertEqual(res.status_code, 200)
        rows = res.data.get("results", res.data)
        formats = {t["format"] for t in rows}
        self.assertIn(Tournament.Format.DAILY, formats)

    def test_club_arena_tournament(self):
        t = Tournament.objects.create(
            name="Club Arena",
            slug="club-arena-test",
            format=Tournament.Format.CLUB_ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=timezone.now(),
            created_by=self.organizer,
            club_a=self.club_a,
            club_b=self.club_b,
        )
        res = self.client.get(f"/api/tournaments/{t.slug}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["format"], Tournament.Format.CLUB_ARENA)
