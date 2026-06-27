"""Tests formats tournoi avancés (daily, club arena)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.tournaments.models import Tournament

User = get_user_model()


class TournamentFormatTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="t_admin", password="x", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_create_daily_tournament(self):
        res = self.client.post(
            "/api/tournaments/",
            {
                "name": "Daily Blitz",
                "format": Tournament.Format.DAILY,
                "time_control": "3+2",
                "max_players": 100,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["format"], Tournament.Format.DAILY)

    def test_create_club_arena_tournament(self):
        res = self.client.post(
            "/api/tournaments/",
            {
                "name": "Club Arena",
                "format": Tournament.Format.CLUB_ARENA,
                "time_control": "5+0",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["format"], Tournament.Format.CLUB_ARENA)
