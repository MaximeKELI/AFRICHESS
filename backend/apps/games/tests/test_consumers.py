from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase, override_settings
from rest_framework_simplejwt.tokens import AccessToken

from apps.games.models import Game
from config.asgi import application

User = get_user_model()

IN_MEMORY_CHANNEL = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL)
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

    def test_unauthenticated_connection_rejected(self):
        async_to_sync(self._test_unauthenticated_connection_rejected)()

    async def _test_unauthenticated_connection_rejected(self):
        user = await User.objects.acreate(username="wsg2", password="x")
        game = await Game.objects.acreate(
            white_player=user,
            status=Game.Status.ACTIVE,
        )
        communicator = WebsocketCommunicator(
            application,
            f"/ws/game/{game.id}/",
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()
