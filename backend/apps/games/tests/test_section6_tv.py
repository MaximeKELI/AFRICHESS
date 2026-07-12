"""Tests approfondis Section 6 — TV / Broadcasts / Live."""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.live_tv import build_tv_payload, tv_games_for_channel
from apps.games.models import Broadcast, BroadcastBoard, Game, SimulBoard, SimulSession

User = get_user_model()


class TvChannelFilterTests(TestCase):
    def setUp(self):
        cache.clear()
        self.users = [
            User.objects.create_user(username=f"tvu{i}", password="x") for i in range(4)
        ]
        # Remplir le top avec du blitz pour simuler le bug « classical invisible »
        for i in range(3):
            Game.objects.create(
                white_player=self.users[0],
                black_player=self.users[1],
                mode="blitz",
                status=Game.Status.ACTIVE,
                move_count=20 + i,
            )
        self.classical = Game.objects.create(
            white_player=self.users[2],
            black_player=self.users[3],
            mode="classical",
            status=Game.Status.ACTIVE,
            move_count=5,
        )

    def test_channel_classical_finds_game_via_db(self):
        games = tv_games_for_channel("classical")
        self.assertEqual(len(games), 1)
        self.assertEqual(games[0].id, self.classical.id)

    def test_api_classical_not_empty_when_only_outside_top_blitz(self):
        # Ancien bug : top 50 blitz → filtre classical = vide
        res = self.client.get("/api/games/live/tv/?channel=classical")
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.data["current"])
        self.assertEqual(res.data["current"]["id"], str(self.classical.id))

    def test_passed_list_does_not_poison_cache(self):
        # Liste pré-filtrée vide ne doit pas cacher un classical vide
        empty = build_tv_payload("classical", games=[])
        self.assertEqual(empty["total"], 0)
        fresh = build_tv_payload("classical")
        self.assertEqual(fresh["total"], 1)


class BroadcastSyncPrivacyTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="bc_own", password="x")
        self.w = User.objects.create_user(username="bc_w", password="x")
        self.b = User.objects.create_user(username="bc_b", password="x")
        self.bc = Broadcast.objects.create(
            slug="test-bc",
            title="Test BC",
            created_by=self.owner,
            is_public=True,
        )
        self.waiting = Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            status=Game.Status.WAITING,
        )
        self.active = Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            status=Game.Status.ACTIVE,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)

    def test_sync_skips_waiting_games(self):
        r = self.client.post(
            "/api/games/broadcasts/test-bc/sync/",
            {"game_ids": [str(self.waiting.id), str(self.active.id)]},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["added"], 1)
        self.assertEqual(BroadcastBoard.objects.filter(broadcast=self.bc).count(), 1)
        self.assertEqual(
            BroadcastBoard.objects.get(broadcast=self.bc).game_id, self.active.id
        )


class SimulJoinCapTests(TestCase):
    def setUp(self):
        self.host = User.objects.create_user(username="sim_h", password="x")
        self.a = User.objects.create_user(username="sim_a", password="x")
        self.b = User.objects.create_user(username="sim_b", password="x")
        self.session = SimulSession.objects.create(
            host=self.host, title="Cap", max_boards=1
        )
        self.client = APIClient()

    def test_second_join_rejected_when_full(self):
        self.client.force_authenticate(self.a)
        r1 = self.client.post(f"/api/games/simul/{self.session.id}/join/")
        self.assertEqual(r1.status_code, 201)
        self.client.force_authenticate(self.b)
        r2 = self.client.post(f"/api/games/simul/{self.session.id}/join/")
        self.assertEqual(r2.status_code, 400)
        self.assertEqual(SimulBoard.objects.filter(session=self.session).count(), 1)
