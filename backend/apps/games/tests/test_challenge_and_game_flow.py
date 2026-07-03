"""Défis, cadence, nulle/abandon et termination_reason."""

from __future__ import annotations

from asgiref.sync import async_to_sync, sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.games.game_actions import accept_draw, offer_draw, resign_game
from apps.games.models import Game, GameChallenge
from apps.games.serializers import serialize_game_move_delta
from apps.games.services import GameService
from config.asgi import application

User = get_user_model()

IN_MEMORY_CHANNEL = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}

FOOLS_MATE_FEN = "rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"


async def _drain_join_messages(communicator):
    await communicator.receive_json_from()
    await communicator.receive_json_from()


class ChallengeUserViewTests(TestCase):
    def setUp(self):
        self.challenger = User.objects.create_user(username="ch_w", password="x")
        self.opponent = User.objects.create_user(username="ch_o", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.challenger)

    def _accept(self, challenge_id: int):
        self.client.force_authenticate(self.opponent)
        return self.client.post(f"/api/games/challenges/{challenge_id}/accept/", {}, format="json")

    def test_challenge_with_explicit_time_control(self):
        res = self.client.post(
            "/api/games/challenge/",
            {
                "username": self.opponent.username,
                "mode": "rapid",
                "is_rated": False,
                "is_timed": True,
                "time_control": "15+10",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        accept = self._accept(res.data["id"])
        self.assertEqual(accept.status_code, 200, accept.data)
        game = Game.objects.get(id=accept.data["game"]["id"])
        self.assertEqual(game.white_time_ms, 900_000)
        self.assertEqual(game.black_time_ms, 900_000)
        self.assertEqual(game.increment_ms, 10_000)

    def test_challenge_defaults_blitz_to_3_plus_2(self):
        res = self.client.post(
            "/api/games/challenge/",
            {
                "username": self.opponent.username,
                "mode": "blitz",
                "is_rated": False,
                "is_timed": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        challenge = GameChallenge.objects.get(pk=res.data["id"])
        self.assertEqual(challenge.time_control, "3+2")
        accept = self._accept(res.data["id"])
        game = Game.objects.get(id=accept.data["game"]["id"])
        self.assertEqual(game.white_time_ms, 180_000)
        self.assertEqual(game.increment_ms, 2_000)

    def test_challenge_classical_30_minutes(self):
        res = self.client.post(
            "/api/games/challenge/",
            {
                "username": self.opponent.username,
                "mode": "classical",
                "is_rated": False,
                "is_timed": True,
                "time_control": "30+0",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        accept = self._accept(res.data["id"])
        game = Game.objects.get(id=accept.data["game"]["id"])
        self.assertEqual(game.white_time_ms, 1_800_000)
        self.assertEqual(game.increment_ms, 0)


class DrawAndResignTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="dr_w", password="x")
        self.black = User.objects.create_user(username="dr_b", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
            is_rated=False,
            started_at=timezone.now(),
        )

    def test_offer_draw_sets_draw_offered_by(self):
        result = offer_draw(self.game, self.white)
        self.assertTrue(result.get("ok"))
        self.assertEqual(result["offered_by"], self.white.id)
        self.game.refresh_from_db()
        self.assertEqual(self.game.draw_offered_by_id, self.white.id)

    def test_accept_draw_sets_termination_reason(self):
        offer_draw(self.game, self.white)
        result = accept_draw(self.game, self.black)
        self.assertTrue(result.get("ok"))
        self.game.refresh_from_db()
        self.assertEqual(self.game.status, Game.Status.COMPLETED)
        self.assertEqual(self.game.result, Game.Result.DRAW)
        self.assertEqual(self.game.termination_reason, "draw_agreement")
        self.assertIsNone(self.game.draw_offered_by_id)

    def test_resign_sets_termination_reason(self):
        resign_game(self.game, self.white)
        self.game.refresh_from_db()
        self.assertEqual(self.game.termination_reason, "resignation")
        self.assertEqual(self.game.result, Game.Result.BLACK_WIN)

    def test_move_delta_includes_pending_draw_offer(self):
        offer_draw(self.game, self.white)
        self.game.refresh_from_db()
        delta = serialize_game_move_delta(self.game, {})
        self.assertEqual(delta["draw_offered_by"], self.white.id)


class FinalizeGameTerminationTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="fin_w", password="x")
        self.black = User.objects.create_user(username="fin_b", password="x")

    def test_finalize_checkmate_sets_termination_reason(self):
        game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
            fen=FOOLS_MATE_FEN,
            started_at=timezone.now(),
        )
        GameService()._finalize_game(game)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.BLACK_WIN)
        self.assertEqual(game.termination_reason, "checkmate")


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL, WS_ALLOW_QUERY_TOKEN=True)
class DrawResignWsBroadcastTests(TransactionTestCase):
    def test_http_draw_offer_broadcasts_to_opponent(self):
        async_to_sync(self._test_http_draw_offer_broadcasts_to_opponent)()

    async def _test_http_draw_offer_broadcasts_to_opponent(self):
        white = await User.objects.acreate(username="ws_dr_w", password="x")
        black = await User.objects.acreate(username="ws_dr_b", password="x")
        game = await Game.objects.acreate(
            white_player=white,
            black_player=black,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
            is_rated=False,
        )
        black_token = str(AccessToken.for_user(black))
        black_ws = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/?token={black_token}",
        )
        self.assertTrue((await black_ws.connect())[0])
        await _drain_join_messages(black_ws)

        @sync_to_async
        def post_draw():
            client = APIClient()
            client.force_authenticate(user=white)
            return client.post(f"/api/games/{game.id}/draw/", {}, format="json")

        resp = await post_draw()
        self.assertEqual(resp.status_code, 200)

        msg = await black_ws.receive_json_from()
        self.assertEqual(msg["event"], "proposition_nulle")
        self.assertEqual(msg["data"]["offered_by"], white.id)

        await game.arefresh_from_db()
        self.assertEqual(game.draw_offered_by_id, white.id)
        await black_ws.disconnect()

    def test_http_resign_broadcasts_fin_partie(self):
        async_to_sync(self._test_http_resign_broadcasts_fin_partie)()

    async def _test_http_resign_broadcasts_fin_partie(self):
        white = await User.objects.acreate(username="ws_rs_w", password="x")
        black = await User.objects.acreate(username="ws_rs_b", password="x")
        game = await Game.objects.acreate(
            white_player=white,
            black_player=black,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
            is_rated=False,
        )
        black_token = str(AccessToken.for_user(black))
        black_ws = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/?token={black_token}",
        )
        self.assertTrue((await black_ws.connect())[0])
        await _drain_join_messages(black_ws)

        @sync_to_async
        def post_resign():
            client = APIClient()
            client.force_authenticate(user=white)
            return client.post(f"/api/games/{game.id}/resign/", {}, format="json")

        resp = await post_resign()
        self.assertEqual(resp.status_code, 200)

        msg = await black_ws.receive_json_from()
        self.assertEqual(msg["event"], "fin_partie")
        self.assertEqual(msg["data"]["game"]["status"], "completed")
        self.assertEqual(msg["data"]["game"]["termination_reason"], "resignation")

        await black_ws.disconnect()
