"""Lichess TV — rotation automatique des parties live par canal."""

from __future__ import annotations

import time
from typing import Any

from django.conf import settings

from apps.ratings.models import PlayerRating

from .game_actions import live_games_queryset
from .models import Game

TV_CHANNELS = ("best", "bullet", "blitz", "rapid", "classical")
ROTATION_SECONDS = getattr(settings, "LIVE_TV_ROTATION_SECONDS", 30)


def _avg_elo(game: Game) -> int:
    mode = game.mode if game.mode in ("bullet", "blitz", "rapid", "classical") else "blitz"
    total = 0
    count = 0
    for user_id in (game.white_player_id, game.black_player_id):
        if not user_id:
            continue
        pr = PlayerRating.objects.filter(user_id=user_id, mode=mode).first()
        total += pr.elo if pr else 1200
        count += 1
    return total // max(count, 1)


def tv_games_for_channel(channel: str) -> list[Game]:
    qs = live_games_queryset()
    if channel != "best":
        qs = qs.filter(mode=channel)
    games = list(qs[:50])
    games.sort(key=lambda g: (_avg_elo(g), g.move_count), reverse=True)
    return games


def build_tv_payload(channel: str) -> dict[str, Any]:
    channel = channel if channel in TV_CHANNELS else "best"
    games = tv_games_for_channel(channel)
    if not games:
        return {
            "channel": channel,
            "current": None,
            "index": 0,
            "total": 0,
            "rotation_seconds": ROTATION_SECONDS,
            "next_rotation_at": None,
            "queue": [],
        }

    slot = int(time.time()) // ROTATION_SECONDS
    idx = slot % len(games)
    next_at = (slot + 1) * ROTATION_SECONDS
    return {
        "channel": channel,
        "current_index": idx,
        "total": len(games),
        "rotation_seconds": ROTATION_SECONDS,
        "next_rotation_at": next_at,
        "current_game_id": str(games[idx].id),
        "queue_game_ids": [str(g.id) for g in games[:12]],
    }
