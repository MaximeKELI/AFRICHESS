from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase, override_settings
from rest_framework_simplejwt.tokens import AccessToken

from apps.games.models import Game
from apps.games.tests.mm_test_utils import reset_matchmaking_state
from apps.social.models import ChatMessage
from config.asgi import application

User = get_user_model()

IN_MEMORY_CHANNEL = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


async def _drain_join_messages(communicator):
    """Consomme game_state + rejoindre_partie après connexion."""
    await communicator.receive_json_from()
    await communicator.receive_json_from()


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL, WS_ALLOW_QUERY_TOKEN=True)
class ChessConsumerTests(TransactionTestCase):
    def test_participant_receives_game_state(self):
        async_to_sync(self._test_participant_receives_game_state)()

    async def _test_participant_receives_game_state(self):
        user = await User.objects.acreate(username="wsg1", password="x")
        game = await Game.objects.acreate(
            white_player=user,
            status=Game.Status.ACTIVE,
        )
        token = str(AccessToken.for_user(user))
        communicator = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/?token={token}",
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        msg = await communicator.receive_json_from()
        self.assertEqual(msg["event"], "game_state")
        msg2 = await communicator.receive_json_from()
        self.assertEqual(msg2["event"], "rejoindre_partie")
        await communicator.disconnect()

    def test_chat_persisted_and_broadcast(self):
        async_to_sync(self._test_chat_persisted_and_broadcast)()

    async def _test_chat_persisted_and_broadcast(self):
        white = await User.objects.acreate(username="chat_w", password="x")
        black = await User.objects.acreate(username="chat_b", password="x")
        game = await Game.objects.acreate(
            white_player=white,
            black_player=black,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
        )
        white_token = str(AccessToken.for_user(white))
        black_token = str(AccessToken.for_user(black))

        white_ws = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/?token={white_token}",
        )
        black_ws = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/?token={black_token}",
        )
        self.assertTrue((await white_ws.connect())[0])
        self.assertTrue((await black_ws.connect())[0])
        await _drain_join_messages(white_ws)
        await _drain_join_messages(black_ws)

        await white_ws.send_json_to({"event": "chat", "message": "Bonne chance !"})
        white_msg = await white_ws.receive_json_from()
        black_msg = await black_ws.receive_json_from()

        self.assertEqual(white_msg["event"], "chat")
        self.assertEqual(black_msg["event"], "chat")
        self.assertEqual(white_msg["data"]["content"], "Bonne chance !")
        self.assertEqual(black_msg["data"]["content"], "Bonne chance !")
        self.assertEqual(white_msg["data"]["sender"]["username"], "chat_w")

        saved = await ChatMessage.objects.filter(
            room_type=ChatMessage.RoomType.GAME,
            room_id=str(game.id),
        ).afirst()
        self.assertIsNotNone(saved)
        self.assertEqual(saved.content, "Bonne chance !")
        self.assertEqual(saved.sender_id, white.id)

        await white_ws.disconnect()
        await black_ws.disconnect()

    def test_chat_rejected_vs_ai(self):
        async_to_sync(self._test_chat_rejected_vs_ai)()

    async def _test_chat_rejected_vs_ai(self):
        user = await User.objects.acreate(username="chat_ai", password="x")
        game = await Game.objects.acreate(
            white_player=user,
            status=Game.Status.ACTIVE,
            is_vs_ai=True,
        )
        token = str(AccessToken.for_user(user))
        communicator = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/?token={token}",
        )
        self.assertTrue((await communicator.connect())[0])
        await _drain_join_messages(communicator)

        await communicator.send_json_to({"event": "chat", "message": "Hi"})
        err = await communicator.receive_json_from()
        self.assertEqual(err["event"], "error")

        count = await ChatMessage.objects.filter(room_id=str(game.id)).acount()
        self.assertEqual(count, 0)
        await communicator.disconnect()

    def test_unauthenticated_can_spectate_active_human_game(self):
        async_to_sync(self._test_unauthenticated_can_spectate_active_human_game)()

    async def _test_unauthenticated_can_spectate_active_human_game(self):
        white = await User.objects.acreate(username="wsg2", password="x")
        black = await User.objects.acreate(username="wsg2b", password="x")
        game = await Game.objects.acreate(
            white_player=white,
            black_player=black,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
        )
        communicator = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/",
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        msg = await communicator.receive_json_from()
        self.assertEqual(msg["event"], "game_state")
        await communicator.disconnect()

    def test_unauthenticated_rejected_vs_ai(self):
        async_to_sync(self._test_unauthenticated_rejected_vs_ai)()

    async def _test_unauthenticated_rejected_vs_ai(self):
        user = await User.objects.acreate(username="wsg_ai_anon", password="x")
        game = await Game.objects.acreate(
            white_player=user,
            status=Game.Status.ACTIVE,
            is_vs_ai=True,
        )
        communicator = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/",
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    def test_resign_via_websocket_completes_game(self):
        async_to_sync(self._test_resign_via_websocket_completes_game)()

    async def _test_resign_via_websocket_completes_game(self):
        white = await User.objects.acreate(username="resign_w", password="x")
        black = await User.objects.acreate(username="resign_b", password="x")
        game = await Game.objects.acreate(
            white_player=white,
            black_player=black,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
            is_rated=False,
        )
        white_token = str(AccessToken.for_user(white))
        black_token = str(AccessToken.for_user(black))

        white_ws = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/?token={white_token}",
        )
        black_ws = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/?token={black_token}",
        )
        self.assertTrue((await white_ws.connect())[0])
        self.assertTrue((await black_ws.connect())[0])
        await _drain_join_messages(white_ws)
        await _drain_join_messages(black_ws)

        await white_ws.send_json_to({"event": "resign"})
        white_msg = await white_ws.receive_json_from()
        black_msg = await black_ws.receive_json_from()

        self.assertEqual(white_msg["event"], "fin_partie")
        self.assertEqual(black_msg["event"], "fin_partie")
        self.assertTrue(white_msg["data"].get("game_over"))

        await game.arefresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.BLACK_WIN)

        await white_ws.disconnect()
        await black_ws.disconnect()


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL, WS_ALLOW_QUERY_TOKEN=True)
class MatchmakingConsumerTests(TransactionTestCase):
    def setUp(self):
        reset_matchmaking_state()

    def test_disconnect_clears_queue_even_when_http_initiated(self):
        async_to_sync(self._test_disconnect_clears_queue_even_when_http_initiated)()

    async def _test_disconnect_clears_queue_even_when_http_initiated(self):
        """Contrat anti-fantômes : la déconnexion du WS matchmaking vide TOUJOURS
        la file, même si l'entrée avait été créée via HTTP.

        Auparavant on conservait les entrées HTTP à la déconnexion, ce qui laissait
        des joueurs « fantômes » (WS listenOnly fermé mais toujours en file). Le
        front compense en se réinscrivant en HTTP à la reconnexion (listenOnly).
        """
        from channels.db import database_sync_to_async

        from apps.games.models import MatchmakingQueue
        from apps.games.services import MatchmakingService

        user = await User.objects.acreate(username="mm_ws", password="x")

        @database_sync_to_async
        def join_queue():
            MatchmakingService().join_queue(
                user, "blitz", 1200, is_rated=False, time_control="3+2"
            )

        await join_queue()
        self.assertTrue(await MatchmakingQueue.objects.filter(user=user).aexists())
        token = str(AccessToken.for_user(user))
        ws = WebsocketCommunicator(
            application,
            f"/ws/matchmaking/?token={token}",
        )
        self.assertTrue((await ws.connect())[0])
        await ws.receive_json_from()
        await ws.disconnect()
        self.assertFalse(
            await MatchmakingQueue.objects.filter(user=user).aexists()
        )

    def test_disconnect_clears_ws_initiated_queue(self):
        async_to_sync(self._test_disconnect_clears_ws_initiated_queue)()

    async def _test_disconnect_clears_ws_initiated_queue(self):
        from apps.games.models import MatchmakingQueue

        user = await User.objects.acreate(username="mm_ws_only", password="x")
        token = str(AccessToken.for_user(user))
        ws = WebsocketCommunicator(
            application,
            f"/ws/matchmaking/?token={token}",
        )
        self.assertTrue((await ws.connect())[0])
        await ws.receive_json_from()
        await ws.send_json_to(
            {
                "event": "rejoindre_file",
                "mode": "blitz",
                "is_timed": True,
                "is_rated": False,
                "time_control": "3+2",
                "variant": "standard",
            }
        )
        await ws.receive_json_from()
        self.assertTrue(await MatchmakingQueue.objects.filter(user=user).aexists())
        await ws.disconnect()
        self.assertFalse(await MatchmakingQueue.objects.filter(user=user).aexists())

    def test_ws_match_found_when_second_player_joins(self):
        async_to_sync(self._test_ws_match_found_when_second_player_joins)()

    async def _test_ws_match_found_when_second_player_joins(self):
        from channels.db import database_sync_to_async

        from apps.games.models import MatchmakingQueue
        from apps.games.services import MatchmakingService

        user_a = await User.objects.acreate(username="mm_ws_a", password="x")
        user_b = await User.objects.acreate(username="mm_ws_b", password="x")

        @database_sync_to_async
        def seed_queue():
            MatchmakingService().join_queue(
                user_a, "blitz", 1200, is_rated=False, time_control="3+2"
            )

        await seed_queue()

        token_a = str(AccessToken.for_user(user_a))
        token_b = str(AccessToken.for_user(user_b))
        ws_a = WebsocketCommunicator(application, f"/ws/matchmaking/?token={token_a}")
        ws_b = WebsocketCommunicator(application, f"/ws/matchmaking/?token={token_b}")
        self.assertTrue((await ws_a.connect())[0])
        self.assertTrue((await ws_b.connect())[0])
        await ws_a.receive_json_from()
        await ws_b.receive_json_from()

        await ws_b.send_json_to(
            {
                "event": "rejoindre_file",
                "mode": "blitz",
                "is_timed": True,
                "is_rated": False,
                "time_control": "3+2",
                "variant": "standard",
            }
        )
        msg_b = await ws_b.receive_json_from()
        self.assertEqual(msg_b["event"], "match_found")
        self.assertIn("game_id", msg_b["data"])

        msg_a = await ws_a.receive_json_from()
        self.assertEqual(msg_a["event"], "match_found")
        self.assertEqual(msg_a["data"]["game_id"], msg_b["data"]["game_id"])
        self.assertFalse(await MatchmakingQueue.objects.aexists())

        await ws_a.disconnect()
        await ws_b.disconnect()
