"""
Tests réseau — parties humain vs humain en ligne.

Couvre :
- suivi connexion / déconnexion (GameRoom)
- forfait automatique après coupure réseau prolongée
- reconnexion WebSocket avec état resynchronisé
- partie qui continue quand un joueur est hors ligne (HTTP / WS adversaire)
"""

from __future__ import annotations

from datetime import timedelta

from asgiref.sync import async_to_sync, sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.games.models import Game, GameRoom
from apps.games.room_utils import ensure_game_room, set_player_connected, try_start_game
from apps.games.services import GameService
from apps.games.tasks import forfeit_disconnected_games
from config.asgi import application

User = get_user_model()

IN_MEMORY_CHANNEL = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


def _human_game(white, black, **kwargs) -> Game:
    return GameService().create_friend_game(
        white,
        black,
        mode="blitz",
        is_timed=True,
        time_control="3+2",
        is_rated=False,
        **kwargs,
    )


async def _drain_join_messages(communicator):
    await communicator.receive_json_from()
    await communicator.receive_json_from()


class GameRoomConnectionTests(TestCase):
    """Suivi présence réseau dans GameRoom."""

    def setUp(self):
        self.white = User.objects.create_user(username="net_w", password="x")
        self.black = User.objects.create_user(username="net_b", password="x")
        self.game = _human_game(self.white, self.black)

    def test_connect_marks_player_online(self):
        room = set_player_connected(self.game, self.white, True)
        self.assertTrue(room.white_connected)
        self.assertIsNone(room.white_disconnected_at)

    def test_disconnect_marks_player_offline_with_timestamp(self):
        set_player_connected(self.game, self.white, True)
        room = set_player_connected(self.game, self.white, False)
        self.assertFalse(room.white_connected)
        self.assertIsNotNone(room.white_disconnected_at)

    def test_reconnect_clears_disconnect_timestamp(self):
        set_player_connected(self.game, self.white, False)
        room = set_player_connected(self.game, self.white, True)
        self.assertTrue(room.white_connected)
        self.assertIsNone(room.white_disconnected_at)

    def test_both_players_connected_can_start_waiting_game(self):
        waiting = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.WAITING,
            is_vs_ai=False,
        )
        ensure_game_room(waiting)
        set_player_connected(waiting, self.white, True)
        set_player_connected(waiting, self.black, True)
        started = try_start_game(waiting)
        self.assertEqual(started.status, Game.Status.ACTIVE)
        self.assertIsNotNone(started.started_at)


@override_settings(DISCONNECT_FORFEIT_SECONDS=90)
class ForfeitDisconnectedTests(TestCase):
    """Forfait Celery quand un joueur reste hors ligne trop longtemps."""

    def setUp(self):
        self.white = User.objects.create_user(username="ff_w", password="x")
        self.black = User.objects.create_user(username="ff_b", password="x")
        self.game = _human_game(self.white, self.black)

    def test_forfeit_awards_win_to_connected_opponent(self):
        set_player_connected(self.game, self.black, True)
        set_player_connected(self.game, self.white, False)
        GameRoom.objects.filter(game=self.game).update(
            white_disconnected_at=timezone.now() - timedelta(seconds=120)
        )

        forfeit_disconnected_games()

        self.game.refresh_from_db()
        self.assertEqual(self.game.status, Game.Status.COMPLETED)
        self.assertEqual(self.game.result, Game.Result.BLACK_WIN)
        self.assertEqual(self.game.termination_reason, "disconnect")
        self.assertEqual(self.game.winner_id, self.black.id)

    def test_no_forfeit_if_disconnect_is_recent(self):
        set_player_connected(self.game, self.black, True)
        set_player_connected(self.game, self.white, False)

        forfeit_disconnected_games()

        self.game.refresh_from_db()
        self.assertEqual(self.game.status, Game.Status.ACTIVE)

    def test_no_forfeit_when_both_players_offline(self):
        set_player_connected(self.game, self.white, False)
        set_player_connected(self.game, self.black, False)
        past = timezone.now() - timedelta(seconds=120)
        GameRoom.objects.filter(game=self.game).update(
            white_disconnected_at=past,
            black_disconnected_at=past,
        )

        forfeit_disconnected_games()

        self.game.refresh_from_db()
        self.assertEqual(self.game.status, Game.Status.ACTIVE)

    def test_no_forfeit_for_ai_games(self):
        ai_game = GameService().create_ai_game(self.white, mode="blitz", color="white")
        room = ensure_game_room(ai_game)
        room.white_connected = False
        room.white_disconnected_at = timezone.now() - timedelta(seconds=120)
        room.save()

        forfeit_disconnected_games()

        ai_game.refresh_from_db()
        self.assertEqual(ai_game.status, Game.Status.ACTIVE)


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL, WS_ALLOW_QUERY_TOKEN=True)
class WsNetworkDisconnectTests(TransactionTestCase):
    """Déconnexion / reconnexion WebSocket en partie humaine."""

    def test_ws_disconnect_updates_game_room(self):
        async_to_sync(self._test_ws_disconnect_updates_game_room)()

    async def _test_ws_disconnect_updates_game_room(self):
        white = await User.objects.acreate(username="ws_dc_w", password="x")
        black = await User.objects.acreate(username="ws_dc_b", password="x")
        game = await sync_to_async(_human_game)(white, black)
        token = str(AccessToken.for_user(white))
        ws = WebsocketCommunicator(application, f"/ws/game/{game.id}/?token={token}")
        self.assertTrue((await ws.connect())[0])
        await _drain_join_messages(ws)

        room = await sync_to_async(GameRoom.objects.get)(game=game)
        self.assertTrue(room.white_connected)

        await ws.disconnect()

        room = await sync_to_async(GameRoom.objects.get)(game=game)
        self.assertFalse(room.white_connected)
        self.assertIsNotNone(room.white_disconnected_at)

    def test_reconnect_receives_current_game_state(self):
        async_to_sync(self._test_reconnect_receives_current_game_state)()

    async def _test_reconnect_receives_current_game_state(self):
        white = await User.objects.acreate(username="ws_rc_w", password="x")
        black = await User.objects.acreate(username="ws_rc_b", password="x")
        game = await sync_to_async(_human_game)(white, black)
        white_token = str(AccessToken.for_user(white))
        black_token = str(AccessToken.for_user(black))

        white_ws = WebsocketCommunicator(
            application, f"/ws/game/{game.id}/?token={white_token}"
        )
        black_ws = WebsocketCommunicator(
            application, f"/ws/game/{game.id}/?token={black_token}"
        )
        self.assertTrue((await white_ws.connect())[0])
        self.assertTrue((await black_ws.connect())[0])
        await _drain_join_messages(white_ws)
        await _drain_join_messages(black_ws)

        await white_ws.send_json_to({"event": "jouer_coup", "uci": "e2e4"})
        await white_ws.receive_json_from()
        await black_ws.receive_json_from()

        await white_ws.disconnect()

        @sync_to_async
        def black_plays():
            client = APIClient()
            client.force_authenticate(user=black)
            return client.post(
                f"/api/games/{game.id}/move/", {"uci": "e7e5"}, format="json"
            )

        resp = await black_plays()
        self.assertEqual(resp.status_code, 200)

        white_ws2 = WebsocketCommunicator(
            application, f"/ws/game/{game.id}/?token={white_token}"
        )
        self.assertTrue((await white_ws2.connect())[0])
        state = await white_ws2.receive_json_from()
        await white_ws2.receive_json_from()
        self.assertEqual(state["event"], "game_state")
        self.assertIn("4p3", state["data"]["game"]["fen"].lower())

        room = await sync_to_async(GameRoom.objects.get)(game=game)
        self.assertTrue(room.white_connected)
        self.assertIsNone(room.white_disconnected_at)

        await white_ws2.disconnect()
        await black_ws.disconnect()

    def test_game_continues_when_opponent_ws_drops(self):
        async_to_sync(self._test_game_continues_when_opponent_ws_drops)()

    async def _test_game_continues_when_opponent_ws_drops(self):
        white = await User.objects.acreate(username="ws_drop_w", password="x")
        black = await User.objects.acreate(username="ws_drop_b", password="x")
        game = await sync_to_async(_human_game)(white, black)
        white_token = str(AccessToken.for_user(white))
        black_token = str(AccessToken.for_user(black))

        white_ws = WebsocketCommunicator(
            application, f"/ws/game/{game.id}/?token={white_token}"
        )
        black_ws = WebsocketCommunicator(
            application, f"/ws/game/{game.id}/?token={black_token}"
        )
        self.assertTrue((await white_ws.connect())[0])
        self.assertTrue((await black_ws.connect())[0])
        await _drain_join_messages(white_ws)
        await _drain_join_messages(black_ws)

        await white_ws.disconnect()

        @sync_to_async
        def white_plays_via_http():
            client = APIClient()
            client.force_authenticate(user=white)
            return client.post(
                f"/api/games/{game.id}/move/", {"uci": "e2e4"}, format="json"
            )

        resp = await white_plays_via_http()
        self.assertEqual(resp.status_code, 200)

        move_msg = await black_ws.receive_json_from()
        self.assertEqual(move_msg["event"], "recevoir_coup")
        self.assertIn("4P3", move_msg["data"]["game"]["fen"])

        await black_ws.disconnect()

    def test_http_move_reaches_opponent_after_reconnect(self):
        async_to_sync(self._test_http_move_reaches_opponent_after_reconnect)()

    async def _test_http_move_reaches_opponent_after_reconnect(self):
        white = await User.objects.acreate(username="ws_hr_w", password="x")
        black = await User.objects.acreate(username="ws_hr_b", password="x")
        game = await sync_to_async(_human_game)(white, black)
        white_token = str(AccessToken.for_user(white))
        black_token = str(AccessToken.for_user(black))

        white_ws = WebsocketCommunicator(
            application, f"/ws/game/{game.id}/?token={white_token}"
        )
        self.assertTrue((await white_ws.connect())[0])
        await _drain_join_messages(white_ws)
        await white_ws.disconnect()

        black_ws = WebsocketCommunicator(
            application, f"/ws/game/{game.id}/?token={black_token}"
        )
        self.assertTrue((await black_ws.connect())[0])
        await _drain_join_messages(black_ws)

        @sync_to_async
        def white_move_http():
            client = APIClient()
            client.force_authenticate(user=white)
            return client.post(
                f"/api/games/{game.id}/move/", {"uci": "e2e4"}, format="json"
            )

        resp = await white_move_http()
        self.assertEqual(resp.status_code, 200)

        msg = await black_ws.receive_json_from()
        self.assertEqual(msg["event"], "recevoir_coup")

        white_ws2 = WebsocketCommunicator(
            application, f"/ws/game/{game.id}/?token={white_token}"
        )
        self.assertTrue((await white_ws2.connect())[0])
        state = await white_ws2.receive_json_from()
        await white_ws2.receive_json_from()
        self.assertEqual(state["data"]["game"]["move_count"], 1)

        await white_ws2.disconnect()
        await black_ws.disconnect()


class HttpOnlyPlayerTests(TestCase):
    """Partie jouable sans WebSocket (joueur 100 % HTTP)."""

    def setUp(self):
        self.white = User.objects.create_user(username="http_only_w", password="x")
        self.black = User.objects.create_user(username="http_only_b", password="x")
        self.game = _human_game(self.white, self.black)
        self.white_client = APIClient()
        self.white_client.force_authenticate(user=self.white)
        self.black_client = APIClient()
        self.black_client.force_authenticate(user=self.black)

    def test_full_opening_without_websocket(self):
        w = self.white_client.post(
            f"/api/games/{self.game.id}/move/", {"uci": "e2e4"}, format="json"
        )
        self.assertEqual(w.status_code, 200)
        b = self.black_client.post(
            f"/api/games/{self.game.id}/move/", {"uci": "e7e5"}, format="json"
        )
        self.assertEqual(b.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.move_count, 2)

    def test_active_games_list_shows_ongoing_pvp(self):
        self.white_client.post(
            f"/api/games/{self.game.id}/move/", {"uci": "e2e4"}, format="json"
        )
        res = self.white_client.get("/api/games/active/")
        self.assertEqual(res.status_code, 200)
        ids = {str(g["id"]) for g in res.data}
        self.assertIn(str(self.game.id), ids)
