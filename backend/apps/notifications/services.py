"""Push temps réel vers le groupe WebSocket notifications."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def push_notification_ws(notification) -> None:
    """Envoie une notif au consumer `NotificationConsumer.notify_push`."""
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        from .serializers import NotificationSerializer

        layer = get_channel_layer()
        if layer is None:
            return
        data = NotificationSerializer(notification).data
        async_to_sync(layer.group_send)(
            f"user_{notification.user_id}_notifications",
            {"type": "notify_push", "notification": data},
        )
    except Exception:
        logger.exception("push_notification_ws failed for notification %s", notification.pk)
