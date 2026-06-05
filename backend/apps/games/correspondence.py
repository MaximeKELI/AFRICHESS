"""Parties par correspondance (daily chess)."""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Game
from .room_utils import ensure_game_room

User = get_user_model()


def create_correspondence_game(
    white,
    black,
    *,
    days_per_move: int = 3,
) -> Game:
    days = max(1, min(int(days_per_move), 14))
    now = timezone.now()
    game = Game.objects.create(
        white_player=white,
        black_player=black,
        mode=Game.Mode.CORRESPONDENCE,
        status=Game.Status.ACTIVE,
        is_timed=False,
        days_per_move=days,
        turn_deadline=now + timedelta(days=days),
        started_at=now,
    )
    ensure_game_room(game)
    return game


def my_correspondence_games(user):
    from django.db.models import Q

    return (
        Game.objects.filter(
            Q(white_player=user) | Q(black_player=user),
            mode=Game.Mode.CORRESPONDENCE,
            status=Game.Status.ACTIVE,
        )
        .select_related("white_player", "black_player")
        .order_by("turn_deadline")
    )


def refresh_turn_deadline(game: Game) -> None:
    if game.mode != Game.Mode.CORRESPONDENCE or game.status != Game.Status.ACTIVE:
        return
    game.turn_deadline = timezone.now() + timedelta(days=game.days_per_move or 3)
    game.save(update_fields=["turn_deadline"])
