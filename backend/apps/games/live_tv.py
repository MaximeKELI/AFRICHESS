"""Lichess TV — rotation automatique des parties live par canal."""

from __future__ import annotations

import time
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q

from apps.ratings.batch import batch_player_ratings

from .game_actions import live_games_queryset
from .models import Game

TV_CHANNELS = ("best", "bullet", "blitz", "rapid", "classical")
ROTATION_SECONDS = getattr(settings, "LIVE_TV_ROTATION_SECONDS", 30)


def batch_player_elos(games: list[Game]) -> dict[tuple[int, str], int]:
    """ELO par (user_id, mode) en une requête."""
    return {k: v["elo"] for k, v in batch_player_ratings(games).items()}


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
    if count == 0:
        return 0
    if game.is_vs_ai and not game.is_tv_exhibition:
        ai_elo = game.ai_target_elo or (game.bot.elo if game.bot_id and game.bot else 1500)
        total += int(ai_elo or 1500)
        count += 1
    return total // max(count, 1)


def tv_games_for_channel(channel: str, games: list[Game] | None = None) -> list[Game]:
    """Canal TV : filtre mode + toujours les exhibitions IA (divertissement permanent)."""
    if games is None:
        qs = live_games_queryset()
        if channel != "best":
            # Humans / vs IA filtrés par cadence + TOUTES les exhibitions
            qs = qs.filter(Q(mode=channel) | Q(is_tv_exhibition=True))
        games = list(qs[:50])
    elif channel != "best":
        games = [
            g for g in games if g.mode == channel or g.is_tv_exhibition
        ][:50]
    elo_map = batch_player_elos(games)
    # Parties réelles (humain / vs IA) avant exhibitions IA vs IA
    games.sort(
        key=lambda g: (
            0 if not g.is_tv_exhibition else 1,
            -_avg_elo(g, elo_map),
            -g.move_count,
        )
    )
    return games


def build_tv_payload(
    channel: str,
    games: list[Game] | None = None,
) -> dict[str, Any]:
    channel = channel if channel in TV_CHANNELS else "best"
    cache_key = f"live_tv:meta:{channel}"
    # Cache uniquement pour les requêtes DB filtrées (pas une liste pré-tronquée)
    use_cache = games is None
    if use_cache:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    games = tv_games_for_channel(channel, games=games)
    if not games:
        payload = {
            "channel": channel,
            "current": None,
            "index": 0,
            "total": 0,
            "rotation_seconds": ROTATION_SECONDS,
            "next_rotation_at": None,
            "queue": [],
            "current_game_id": None,
            "queue_game_ids": [],
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

    if use_cache:
        cache.set(cache_key, payload, ROTATION_SECONDS)
    return payload
