"""Tests simultanées."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.models import SimulSession

User = get_user_model()


class SimulTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(username="simul_host", password="x")
        self.opponent1 = User.objects.create_user(username="simul_o1", password="x")
        self.opponent2 = User.objects.create_user(username="simul_o2", password="x")
        self.client.force_authenticate(user=self.host)

    def test_list_includes_active_sessions(self):
        SimulSession.objects.create(host=self.host, status=SimulSession.Status.ACTIVE, title="Live")
        resp = self.client.get("/api/games/simul/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["status"], "active")

    def test_join_when_active_allows_second_board(self):
        create = self.client.post(
            "/api/games/simul/",
            {"title": "Test simul", "max_boards": 5},
            format="json",
        )
        session_id = create.data["id"]
        self.client.force_authenticate(user=self.opponent1)
        self.client.post(f"/api/games/simul/{session_id}/join/", {}, format="json")
        session = SimulSession.objects.get(pk=session_id)
        self.assertEqual(session.status, SimulSession.Status.ACTIVE)
        self.client.force_authenticate(user=self.opponent2)
        resp = self.client.post(f"/api/games/simul/{session_id}/join/", {}, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(session.boards.count(), 2)
