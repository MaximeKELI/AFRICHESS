"""Tests vote chess."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.social.models import Club

User = get_user_model()


class VoteChessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organizer = User.objects.create_user(username="vote_org", password="x")
        self.owner_white = User.objects.create_user(username="club_w", password="x")
        self.owner_black = User.objects.create_user(username="club_b", password="x")
        self.club_white = Club.objects.create(name="Club A", slug="club-a", owner=self.owner_white)
        self.club_black = Club.objects.create(name="Club B", slug="club-b", owner=self.owner_black)
        self.club_white.members.add(self.organizer)
        self.client.force_authenticate(user=self.organizer)

    def test_create_uses_distinct_representatives(self):
        resp = self.client.post(
            "/api/games/vote/create/",
            {"club_white": "club-a", "club_black": "club-b", "mode": "rapid"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        game = resp.data
        self.assertNotEqual(game["white_player"]["id"], game["black_player"]["id"])
        self.assertEqual(game["white_player"]["id"], self.owner_white.id)
        self.assertEqual(game["black_player"]["id"], self.owner_black.id)

    def test_rejects_same_club(self):
        resp = self.client.post(
            "/api/games/vote/create/",
            {"club_white": "club-a", "club_black": "club-a"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_join_when_active_allows_second_board(self):
        from apps.games.models import SimulSession

        self.client.force_authenticate(user=self.organizer)
        create = self.client.post(
            "/api/games/simul/",
            {"title": "Test simul", "max_boards": 5},
            format="json",
        )
        session_id = create.data["id"]
        opponent2 = User.objects.create_user(username="opp2", password="x")
        self.client.force_authenticate(user=self.owner_black)
        self.client.post(f"/api/games/simul/{session_id}/join/", {}, format="json")
        session = SimulSession.objects.get(pk=session_id)
        self.assertEqual(session.status, SimulSession.Status.ACTIVE)
        self.client.force_authenticate(user=opponent2)
        resp = self.client.post(f"/api/games/simul/{session_id}/join/", {}, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(session.boards.count(), 2)

    def test_cast_and_apply_vote(self):
        resp = self.client.post(
            "/api/games/vote/create/",
            {"club_white": "club-a", "club_black": "club-b", "mode": "rapid"},
            format="json",
        )
        game_id = resp.data["id"]
        voter = User.objects.create_user(username="voter_a", password="x")
        self.club_white.members.add(voter)
        self.client.force_authenticate(user=voter)

        cast = self.client.post(
            f"/api/games/{game_id}/vote/",
            {"move_uci": "e2e4"},
            format="json",
        )
        self.assertEqual(cast.status_code, 200)
        self.assertEqual(cast.data["tally"]["e2e4"], 1)
        self.assertIn("tally_san", cast.data)
        self.assertEqual(cast.data["tally_san"]["e2e4"], "e4")

        status = self.client.get(f"/api/games/{game_id}/vote/status/")
        self.assertEqual(status.status_code, 200)
        self.assertEqual(status.data["my_vote"], "e2e4")

        self.client.force_authenticate(user=self.owner_white)
        apply_resp = self.client.post(f"/api/games/{game_id}/vote/apply/", {}, format="json")
        self.assertEqual(apply_resp.status_code, 200)
        self.assertGreaterEqual(apply_resp.data["move_count"], 1)
