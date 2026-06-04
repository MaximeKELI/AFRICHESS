from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.games.models import Game
from apps.tournaments.models import Tournament
from apps.tournaments.services import TournamentEngine

User = get_user_model()


class TournamentEngineTests(TestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(username="org", password="x")
        self.p1 = User.objects.create_user(username="tp1", password="x")
        self.p2 = User.objects.create_user(username="tp2", password="x")
        now = timezone.now()
        self.tournament = Tournament.objects.create(
            name="Test Arena",
            slug="test-arena",
            format=Tournament.Format.ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=now,
            created_by=self.organizer,
        )
        engine = TournamentEngine()
        engine.ensure_participant(self.tournament, self.p1)
        engine.ensure_participant(self.tournament, self.p2)

    def test_start_arena_creates_games(self):
        engine = TournamentEngine()
        engine.start_tournament(self.tournament)
        self.tournament.refresh_from_db()
        self.assertEqual(self.tournament.status, Tournament.Status.ACTIVE)
        self.assertEqual(
            Game.objects.filter(tournament=self.tournament, is_vs_ai=False).count(),
            1,
        )

    def test_standings_after_participant(self):
        from apps.tournaments.models import TournamentParticipant

        self.assertEqual(
            TournamentParticipant.objects.filter(tournament=self.tournament).count(),
            2,
        )
