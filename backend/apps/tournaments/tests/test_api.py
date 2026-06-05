from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.tournaments.models import Tournament, TournamentParticipant

User = get_user_model()


class TournamentApiTests(TestCase):
    def setUp(self):
        self.organizer = User.objects.create_user(username="torg", password="x")
        self.player = User.objects.create_user(username="tpl", password="x")
        self.tournament = Tournament.objects.create(
            name="Open API",
            slug="open-api",
            format=Tournament.Format.ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=timezone.now(),
            created_by=self.organizer,
            max_players=32,
        )
        self.client = APIClient()

    def test_register_tournament(self):
        self.client.force_authenticate(self.player)
        res = self.client.post("/api/tournaments/open-api/register/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(
            TournamentParticipant.objects.filter(
                tournament=self.tournament,
                user=self.player,
            ).exists()
        )

    def test_my_tournament_game_none_when_not_playing(self):
        self.client.force_authenticate(self.player)
        res = self.client.get("/api/tournaments/open-api/my-game/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["game"])
