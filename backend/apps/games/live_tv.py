"""Lichess TV — rotation automatique des parties live par canal."""

from __future__ import annotations

import time
from typing import Any

from django.conf import settings
from django.core.cache import cache

from apps.ratings.models import PlayerRating

from .game_actions import live_games_queryset
from .models import Game
from .serializers import _game_rating_mode

TV_CHANNELS = ("best", "bullet", "blitz", "rapid", "classical")
ROTATION_SECONDS = getattr(settings, "LIVE_TV_ROTATION_SECONDS", 30)


def batch_player_elos(games: list[Game]) -> dict[tuple[int, str], int]:
    """ELO par (user_id, mode) en une requête."""
    keys: set[tuple[int, str]] = set()
    for game in games:
        mode = _game_rating_mode(game)
        for uid in (game.white_player_id, game.black_player_id):
            if uid:
                keys.add((uid, mode))
    if not keys:
        return {}
    user_ids = {k[0] for k in keys}
    modes = {k[1] for k in keys}
    ratings = PlayerRating.objects.filter(user_id__in=user_ids, mode__in=modes)
    return {(r.user_id, r.mode): r.elo for r in ratings}


def _avg_elo(game: Game, elo_map: dict[tuple[int, str], int]) -> int:
    mode = game.mode if game.mode in ("bullet", "blitz", "rapid", "classical") else "blitz"
    total = 0
    count = 0
    for uid, player in (
        (game.white_player_id, game.white_player),
        (game.black_player_id, game.black_player),
    ):
        if not uid:
            continue
        elo = elo_map.get((uid, mode))
        if elo is None and player is not None:
            elo = player.initial_elo
        total += elo or 1200
        count += 1
    return total // max(count, 1)


def tv_games_for_channel(channel: str) -> list[Game]:
    qs = live_games_queryset()
    if channel != "best":
        qs = qs.filter(mode=channel)
    games = list(qs[:50])
    elo_map = batch_player_elos(games)
    games.sort(key=lambda g: (_avg_elo(g, elo_map), g.move_count), reverse=True)
    return games


def build_tv_payload(channel: str) -> dict[str, Any]:
    channel = channel if channel in TV_CHANNELS else "best"
    cache_key = f"live_tv:meta:{channel}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    games = tv_games_for_channel(channel)
    if not games:
        payload = {
            "channel": channel,
            "current": None,
            "index": 0,
            "total": 0,
            "rotation_seconds": ROTATION_SECONDS,
            "next_rotation_at": None,
            "queue": [],
        }
    else:
        slot = int(time.time()) // ROTATION_SECONDS
        idx = slot % len(games)
        next_at = (slot + 1) * ROTATION_SECONDS
        payload = {
            "channel": channel,
            "current_index": idx,
            "total": len(games),
            "rotation_seconds": ROTATION_SECONDS,
            "next_rotation_at": next_at,
            "current_game_id": str(games[idx].id),
            "queue_game_ids": [str(g.id) for g in games[:12]],
        }

    cache.set(cache_key, payload, ROTATION_SECONDS)
    return payload
