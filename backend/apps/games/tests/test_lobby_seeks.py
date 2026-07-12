"""Tests lobby seeks ouverts (parité Lichess Create lobby game)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.challenge_service import (
    ChallengeError,
    accept_lobby_seek,
    cancel_challenge,
    create_lobby_seek,
    list_open_seeks,
)
from apps.games.models import Game, GameChallenge
from apps.tournaments.models import Tournament
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class LobbySeekServiceTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="lobby_a", password="x")
        self.b = User.objects.create_user(username="lobby_b", password="x")

    def test_create_list_accept_creates_game(self):
        seek = create_lobby_seek(self.a, mode="blitz", time_control="3+2", is_rated=False)
        self.assertIsNone(seek.opponent_id)
        self.assertEqual(seek.status, GameChallenge.Status.PENDING)

        open_seeks = list(list_open_seeks())
        self.assertEqual(len(open_seeks), 1)
        self.assertEqual(open_seeks[0].id, seek.id)

        accepted = accept_lobby_seek(seek, self.b)
        self.assertEqual(accepted.status, GameChallenge.Status.ACCEPTED)
        self.assertEqual(accepted.opponent_id, self.b.id)
        self.assertIsNotNone(accepted.game_id)
        game = Game.objects.get(pk=accepted.game_id)
        self.assertIn(self.a.id, (game.white_player_id, game.black_player_id))
        self.assertIn(self.b.id, (game.white_player_id, game.black_player_id))

    def test_cannot_accept_own_seek(self):
        seek = create_lobby_seek(self.a, mode="blitz", time_control="3+2")
        with self.assertRaises(ChallengeError):
            accept_lobby_seek(seek, self.a)

    def test_one_pending_seek_max(self):
        create_lobby_seek(self.a, mode="blitz", time_control="3+2")
        with self.assertRaises(ChallengeError) as ctx:
            create_lobby_seek(self.a, mode="rapid", time_control="10+0")
        self.assertEqual(ctx.exception.code, "lobby_seek_pending")

    def test_cancel_seek(self):
        seek = create_lobby_seek(self.a, mode="blitz", time_control="3+2")
        cancel_challenge(seek, self.a)
        seek.refresh_from_db()
        self.assertEqual(seek.status, GameChallenge.Status.CANCELLED)
        self.assertEqual(list(list_open_seeks()), [])


class LobbySeekApiTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="api_lobby_a", password="x")
        self.b = User.objects.create_user(username="api_lobby_b", password="x")
        self.client = APIClient()

    def test_http_create_accept_flow(self):
        self.client.force_authenticate(self.a)
        r = self.client.post(
            "/api/games/lobby/",
            {"mode": "blitz", "time_control": "5+0", "is_rated": False, "color": "white"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        seek_id = r.data["id"]
        self.assertIsNone(r.data["opponent"])

        self.client.force_authenticate(self.b)
        r2 = self.client.post(f"/api/games/lobby/{seek_id}/accept/", format="json")
        self.assertEqual(r2.status_code, 200, r2.content)
        self.assertIn("game", r2.data)
        self.assertTrue(r2.data["game"]["id"])

    def test_http_cancel(self):
        self.client.force_authenticate(self.a)
        r = self.client.post(
            "/api/games/lobby/",
            {"mode": "blitz", "time_control": "3+2"},
            format="json",
        )
        seek_id = r.data["id"]
        r2 = self.client.delete(f"/api/games/lobby/{seek_id}/")
        self.assertEqual(r2.status_code, 200, r2.content)
        self.assertEqual(r2.data["status"], "cancelled")


class TournamentFormatFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username="tourney_owner", password="x")
        now = timezone.now()
        Tournament.objects.create(
            name="Arena Test",
            slug="arena-filter-test",
            format=Tournament.Format.ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=now + timedelta(hours=1),
            created_by=self.owner,
        )
        Tournament.objects.create(
            name="Swiss Test",
            slug="swiss-filter-test",
            format=Tournament.Format.SWISS,
            status=Tournament.Status.REGISTRATION,
            mode="rapid",
            starts_at=now + timedelta(hours=2),
            created_by=self.owner,
        )

    def test_filter_arena(self):
        r = self.client.get("/api/tournaments/?tournament_format=arena")
        self.assertEqual(r.status_code, 200)
        data = r.data if isinstance(r.data, list) else r.data.get("results", [])
        self.assertTrue(all(t["format"] == "arena" for t in data))
        self.assertTrue(any(t["slug"] == "arena-filter-test" for t in data))

    def test_filter_swiss(self):
        r = self.client.get("/api/tournaments/?tournament_format=swiss")
        self.assertEqual(r.status_code, 200)
        data = r.data if isinstance(r.data, list) else r.data.get("results", [])
        self.assertTrue(all(t["format"] == "swiss" for t in data))
        self.assertTrue(any(t["slug"] == "swiss-filter-test" for t in data))


class TournamentCupFilterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username="cup_owner", password="x")
        now = timezone.now()
        Tournament.objects.create(
            name="Africa Cup",
            slug="africa-cup-filter",
            format=Tournament.Format.ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=now + timedelta(hours=1),
            created_by=self.owner,
            is_african_cup=True,
            is_international_cup=False,
        )
        Tournament.objects.create(
            name="World Cup",
            slug="world-cup-filter",
            format=Tournament.Format.SWISS,
            status=Tournament.Status.REGISTRATION,
            mode="rapid",
            starts_at=now + timedelta(hours=2),
            created_by=self.owner,
            is_african_cup=False,
            is_international_cup=True,
        )

    def test_cup_international(self):
        r = self.client.get("/api/tournaments/?cup=international")
        self.assertEqual(r.status_code, 200)
        data = r.data if isinstance(r.data, list) else r.data.get("results", [])
        self.assertTrue(all(t.get("is_international_cup") for t in data))
        self.assertTrue(any(t["slug"] == "world-cup-filter" for t in data))

    def test_cup_african(self):
        r = self.client.get("/api/tournaments/?cup=african")
        self.assertEqual(r.status_code, 200)
        data = r.data if isinstance(r.data, list) else r.data.get("results", [])
        self.assertTrue(all(t.get("is_african_cup") for t in data))
        self.assertTrue(any(t["slug"] == "africa-cup-filter" for t in data))

    def test_cup_all_cups(self):
        r = self.client.get("/api/tournaments/?cup=cups")
        self.assertEqual(r.status_code, 200)
        data = r.data if isinstance(r.data, list) else r.data.get("results", [])
        slugs = {t["slug"] for t in data}
        self.assertIn("africa-cup-filter", slugs)
        self.assertIn("world-cup-filter", slugs)
