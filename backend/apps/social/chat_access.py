"""Contrôle d'accès aux salons de chat."""

import re
from uuid import UUID

from django.contrib.auth.models import AnonymousUser

from apps.games.game_access import can_view_game
from apps.games.models import Game

from .models import ChatMessage, Club

_DM_ROOM_RE = re.compile(r"^(\d+)_(\d+)$")


def parse_dm_room(room_id: str) -> tuple[int, int] | None:
    m = _DM_ROOM_RE.match(room_id or "")
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))


def user_in_dm_room(user, room_id: str) -> bool:
    if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
        return False
    parsed = parse_dm_room(room_id)
    if not parsed:
        return False
    a, b = parsed
    return user.id in (a, b)


def user_can_access_chat_room(user, room_type: str, room_id: str) -> bool:
    if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
        return False

    if room_type == ChatMessage.RoomType.DIRECT:
        return user_in_dm_room(user, room_id)

    if room_type == ChatMessage.RoomType.GAME:
        try:
            game_id = UUID(str(room_id))
        except (ValueError, TypeError):
            return False
        try:
            game = Game.objects.get(pk=game_id)
        except Game.DoesNotExist:
            return False
        return can_view_game(user, game)

    if room_type == ChatMessage.RoomType.CLUB:
        return Club.objects.filter(slug=room_id, members=user).exists()

    return False
