from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.notifications.models import DeviceToken, Notification
from apps.notifications.push_native import deliver_notification_push, send_expo_push

User = get_user_model()


class PushNativeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pushuser", password="x")

    @patch("apps.notifications.push_native.requests.post")
    def test_send_expo_push(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"data": [{"status": "ok"}]},
            raise_for_status=lambda: None,
        )
        send_expo_push(["ExponentPushToken[abc]"], "Hello", "World", {"game_id": "1"})
        mock_post.assert_called_once()
        body = mock_post.call_args.kwargs["json"]
        self.assertEqual(body[0]["title"], "Hello")

    @override_settings(PUSH_NOTIFICATIONS_ENABLED=True)
    @patch("apps.notifications.push_native.send_expo_push")
    @patch("apps.notifications.push_native.send_web_push")
    def test_deliver_notification_push(self, mock_web, mock_expo):
        DeviceToken.objects.create(
            user=self.user,
            token="ExponentPushToken[test]",
            platform=DeviceToken.Platform.ANDROID,
            kind=DeviceToken.Kind.EXPO,
        )
        # Créer la notif avec signals push coupés pour ne compter qu'un seul envoi.
        with patch("apps.notifications.signals.push_notification_ws"), patch(
            "apps.notifications.signals.enqueue_native_push"
        ):
            n = Notification.objects.create(
                user=self.user,
                type=Notification.Type.MATCH_FOUND,
                title="Match",
                body="vs opponent",
                data={"game_id": "uuid"},
            )
            deliver_notification_push(n)
        mock_expo.assert_called_once()
        mock_web.assert_called_once()
