"""HTTP → WebSocket sync (coups, abort)."""

from asgiref.sync import async_to_sync, sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.games.models import Game
from config.asgi import application

User = get_user_model()

IN_MEMORY_CHANNEL = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


async def _drain_join_messages(communicator):
    await communicator.receive_json_from()
    await communicator.receive_json_from()


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL, WS_ALLOW_QUERY_TOKEN=True)
class HttpWsSyncTests(TransactionTestCase):
    def test_http_move_broadcasts_to_websocket(self):
        async_to_sync(self._test_http_move_broadcasts_to_websocket)()

    async def _test_http_move_broadcasts_to_websocket(self):
        white = await User.objects.acreate(username="http_mv_w", password="x")
        black = await User.objects.acreate(username="http_mv_b", password="x")
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
        def post_move():
            client = APIClient()
            client.force_authenticate(user=white)
            return client.post(
                f"/api/games/{game.id}/move/",
                {"uci": "e2e4"},
                format="json",
            )

        resp = await post_move()
        self.assertEqual(resp.status_code, 200)

        msg = await black_ws.receive_json_from()
        self.assertEqual(msg["event"], "recevoir_coup")
        self.assertEqual(msg["data"]["game"]["fen"], resp.data["fen"])

        await black_ws.disconnect()

    def test_http_abort_broadcasts_to_websocket(self):
        async_to_sync(self._test_http_abort_broadcasts_to_websocket)()

    async def _test_http_abort_broadcasts_to_websocket(self):
        white = await User.objects.acreate(username="http_ab_w", password="x")
        black = await User.objects.acreate(username="http_ab_b", password="x")
        game = await Game.objects.acreate(
            white_player=white,
            black_player=black,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
            is_rated=False,
            move_count=0,
        )
        black_token = str(AccessToken.for_user(black))
        black_ws = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/?token={black_token}",
        )
        self.assertTrue((await black_ws.connect())[0])
        await _drain_join_messages(black_ws)

        @sync_to_async
        def post_abort():
            client = APIClient()
            client.force_authenticate(user=white)
            return client.post(f"/api/games/{game.id}/abort/", {}, format="json")

        resp = await post_abort()
        self.assertEqual(resp.status_code, 200)

        msg = await black_ws.receive_json_from()
        self.assertEqual(msg["event"], "fin_partie")
        self.assertTrue(msg["data"].get("game_over"))

        await game.arefresh_from_db()
        self.assertEqual(game.status, Game.Status.ABORTED)
        await black_ws.disconnect()
