"""Notifications WebSocket depuis les vues HTTP (nulle, reprise, etc.)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def notify_game_room(game_id, handler: str, payload: dict) -> None:
    """Envoie un événement au groupe Channels de la partie (`game_<uuid>`)."""
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            f"game_{game_id}",
            {"type": handler, "payload": payload},
        )
    except Exception as exc:
        logger.warning("WS notify game=%s handler=%s failed: %s", game_id, handler, exc)
