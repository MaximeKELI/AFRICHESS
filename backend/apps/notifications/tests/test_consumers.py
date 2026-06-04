from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.test import TransactionTestCase, override_settings
from rest_framework_simplejwt.tokens import AccessToken

from apps.notifications.models import Notification
from config.asgi import application

User = get_user_model()

IN_MEMORY_CHANNEL = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL)
class NotificationConsumerTests(TransactionTestCase):
    def test_connect_receives_snapshot(self):
        async_to_sync(self._test_connect_receives_snapshot)()

    async def _test_connect_receives_snapshot(self):
        user = await User.objects.acreate(username="wsn1", password="x")
        await Notification.objects.acreate(
            user=user,
            type="system",
            title="Hi",
            body="",
        )
        token = str(AccessToken.for_user(user))
        communicator = WebsocketCommunicator(
            application,
            f"/ws/notifications/?token={token}",
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        response = await communicator.receive_json_from()
        self.assertEqual(response["event"], "notifications")
        self.assertGreaterEqual(len(response["data"]), 1)
        await communicator.disconnect()

    def test_notify_push_event(self):
        async_to_sync(self._test_notify_push_event)()

    async def _test_notify_push_event(self):
        user = await User.objects.acreate(username="wsn2", password="x")
        token = str(AccessToken.for_user(user))
        communicator = WebsocketCommunicator(
            application,
            f"/ws/notifications/?token={token}",
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.receive_json_from()

        layer = get_channel_layer()
        await layer.group_send(
            f"user_{user.id}_notifications",
            {
                "type": "notify_push",
                "notification": {
                    "id": 99,
                    "type": "system",
                    "title": "Live",
                    "body": "",
                    "data": {},
                    "is_read": False,
                    "created_at": "2026-01-01T00:00:00Z",
                },
            },
        )
        msg = await communicator.receive_json_from()
        self.assertEqual(msg["event"], "new_notification")
        self.assertEqual(msg["data"]["title"], "Live")
        await communicator.disconnect()
