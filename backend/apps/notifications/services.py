"""Push temps réel vers le groupe WebSocket notifications + helpers."""

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


def enqueue_native_push(notification) -> None:
    """File d'attente Celery pour push APNs/FCM/Web — repli synchrone si Celery indisponible."""
    try:
        from .tasks import send_native_push_task

        send_native_push_task.delay(notification.pk)
    except Exception:
        logger.warning("Celery unavailable for push — sync fallback", exc_info=True)
        from .push_native import deliver_notification_push

        deliver_notification_push(notification)


def create_match_found_notifications(user_a_id: int, user_b_id: int, game) -> None:
    from apps.users.models import User

    from .models import Notification

    users = {u.id: u for u in User.objects.filter(pk__in=[user_a_id, user_b_id])}
    for uid in (user_a_id, user_b_id):
        opp_id = user_b_id if uid == user_a_id else user_a_id
        opp = users.get(opp_id)
        opp_name = getattr(opp, "username", "adversaire")
        Notification.objects.create(
            user_id=uid,
            type=Notification.Type.MATCH_FOUND,
            title="Partie trouvée !",
            body=f"{game.mode} vs {opp_name}",
            data={
                "game_id": str(game.id),
                "mode": game.mode,
                "action": "match_found",
            },
        )
