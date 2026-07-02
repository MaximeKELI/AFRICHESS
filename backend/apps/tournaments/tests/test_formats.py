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

    def test_team_battle_team_scores(self):
        t = Tournament.objects.create(
            name="Team Battle",
            slug="team-battle-test",
            format=Tournament.Format.TEAM_BATTLE,
            status=Tournament.Status.ACTIVE,
            mode="blitz",
            starts_at=timezone.now(),
            created_by=self.organizer,
            club_a=self.club_a,
            club_b=self.club_b,
        )
        u1 = User.objects.create_user(username="tb1", password="x")
        u2 = User.objects.create_user(username="tb2", password="x")
        from apps.tournaments.models import TournamentParticipant

        TournamentParticipant.objects.create(
            tournament=t, user=u1, club=self.club_a, score=4, wins=2
        )
        TournamentParticipant.objects.create(
            tournament=t, user=u2, club=self.club_b, score=2, wins=1
        )
        res = self.client.get(f"/api/tournaments/{t.slug}/team-scores/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["teams"]), 2)
        self.assertEqual(res.data["teams"][0]["club_slug"], "club-a")
