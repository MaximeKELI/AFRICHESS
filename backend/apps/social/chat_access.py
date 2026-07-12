"""Contrôle d'accès aux salons de chat."""

from __future__ import annotations

import re
from uuid import UUID

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from apps.games.game_access import can_view_game, user_is_participant
from apps.games.models import Game

from .models import ChatMessage, Club
from .relationships import is_blocked

User = get_user_model()

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


def _dm_other_user(user, room_id: str):
    parsed = parse_dm_room(room_id)
    if not parsed:
        return None
    a, b = parsed
    other_id = b if user.id == a else a if user.id == b else None
    if other_id is None:
        return None
    return User.objects.filter(pk=other_id).first()


def user_can_view_chat_room(user, room_type: str, room_id: str) -> bool:
    """Lecture : spectateurs OK en partie ; DM interdit si blocage."""
    if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
        return False

    if room_type == ChatMessage.RoomType.DIRECT:
        if not user_in_dm_room(user, room_id):
            return False
        other = _dm_other_user(user, room_id)
        if not other:
            return False
        return not is_blocked(user, other)

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


def user_can_send_chat_message(user, room_type: str, room_id: str) -> bool:
    """Écriture : participants uniquement en partie ; blocage respecté en DM."""
    if not user_can_view_chat_room(user, room_type, room_id):
        return False

    if room_type == ChatMessage.RoomType.GAME:
        try:
            game_id = UUID(str(room_id))
        except (ValueError, TypeError):
            return False
        try:
            game = Game.objects.get(pk=game_id)
        except Game.DoesNotExist:
            return False
        return user_is_participant(user, game)

    return True


def user_can_access_chat_room(user, room_type: str, room_id: str) -> bool:
    """Alias historique = droit de lecture."""
    return user_can_view_chat_room(user, room_type, room_id)
