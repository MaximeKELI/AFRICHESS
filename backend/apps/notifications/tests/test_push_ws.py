from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.notifications.models import Notification
from apps.notifications.services import push_notification_ws

User = get_user_model()

IN_MEMORY_CHANNEL = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}


@override_settings(CHANNEL_LAYERS=IN_MEMORY_CHANNEL)
class NotificationPushWsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="notif1", password="x")

    @patch("channels.layers.get_channel_layer")
    def test_push_notification_ws_group_send(self, mock_layer_fn):
        layer = MagicMock()
        mock_layer_fn.return_value = layer
        n = Notification(
            user=self.user,
            type=Notification.Type.SYSTEM,
            title="Test",
            body="Hello",
        )
        with patch("apps.notifications.signals.push_notification_ws") as mock_sig:
            n.save()
            mock_sig.assert_called_once()
        from apps.notifications.services import push_notification_ws

        push_notification_ws(n)
        layer.group_send.assert_called_once()
        args = layer.group_send.call_args[0]
        self.assertEqual(args[0], f"user_{self.user.id}_notifications")
        self.assertEqual(args[1]["type"], "notify_push")
        self.assertEqual(args[1]["notification"]["title"], "Test")

    def test_signal_on_create(self):
        with patch("apps.notifications.signals.push_notification_ws") as mock_push:
            Notification.objects.create(
                user=self.user,
                type=Notification.Type.SYSTEM,
                title="Sig",
                body="",
            )
            mock_push.assert_called_once()

    def test_push_service_serializes(self):
        n = Notification.objects.create(
            user=self.user,
            type=Notification.Type.GAME_INVITE,
            title="Partie",
            data={"game_id": "abc"},
        )
        with patch("apps.notifications.services.async_to_sync") as mock_async:
            mock_async.return_value = lambda coro: None
            with patch("apps.notifications.services.get_channel_layer") as mock_layer_fn:
                layer = MagicMock()
                mock_layer_fn.return_value = layer
                push_notification_ws(n)
                self.assertTrue(layer.group_send.called)
