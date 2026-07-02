"""Pools matchmaking Lichess-style — élargissement ELO et retry rapide."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model

from . import matchmaking_redis as mmr
from .models import MatchmakingQueue

logger = logging.getLogger(__name__)

User = get_user_model()


def elo_range_for_wait(wait_seconds: float, base: int | None = None) -> int:
    """+50 ELO de portée toutes les 3 s d'attente (max configurable)."""
    base = base if base is not None else getattr(settings, "MATCHMAKING_ELO_RANGE", 200)
    step = getattr(settings, "MATCHMAKING_POOL_EXPAND_STEP", 50)
    interval = getattr(settings, "MATCHMAKING_POOL_EXPAND_SECONDS", 3)
    max_range = getattr(settings, "MATCHMAKING_POOL_MAX_RANGE", 500)
    bonus = int(max(0, wait_seconds) // interval) * step
    return min(max_range, base + bonus)


def _user_wait_seconds(client, user_id: int) -> float:
    user_key = f"{mmr.USER_KEY_PREFIX}{user_id}"
    joined = client.hget(user_key, "joined_at")
    if not joined:
        return 0.0
    try:
        return max(0.0, time.time() - float(joined))
    except (TypeError, ValueError):
        return 0.0


def _meta_from_hash(data: dict[str, str]) -> dict[str, Any]:
    try:
        return json.loads(data.get("meta") or "{}")
    except json.JSONDecodeError:
        return {}


def try_pair_waiting_user(user_id: int, svc) -> bool:
    """
    Tente un pairing immédiat pour un joueur en attente (range élargie).
    Retourne True si une partie a été créée.
    """
    if not mmr.is_redis_matchmaking_available():
        return False
    client = mmr._get_client()
    user_key = f"{mmr.USER_KEY_PREFIX}{user_id}"
    data = client.hgetall(user_key)
    if not data or not client.sismember(mmr.WAITING_SET, str(user_id)):
        return False

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        mmr.leave_user(user_id)
        return False

    meta = _meta_from_hash(data)
    pool = data.get("pool")
    if not pool or not meta:
        return False

    elo = int(float(data.get("elo", user.initial_elo)))
    wait = _user_wait_seconds(client, user_id)
    elo_range = elo_range_for_wait(wait)

    result = mmr.match_or_enqueue(
        user_id=user_id,
        elo=elo,
        pool=pool,
        meta=meta,
        elo_range=elo_range,
        enqueue_if_no_match=False,
    )
    if not result or result.status != "paired" or not result.opponent_id:
        return False

    # Évite double création : seul le joueur au plus petit id crée la partie
    opponent_id = result.opponent_id
    if user_id > opponent_id:
        return False

    try:
        opponent = User.objects.get(pk=opponent_id)
    except User.DoesNotExist:
        return False

    mode = meta.get("mode", "blitz")
    svc._create_match(
        user,
        opponent,
        mode,
        is_timed=meta.get("is_timed", True),
        time_minutes=meta.get("time_control_minutes"),
        time_control=meta.get("time_control") or None,
        is_rated=meta.get("is_rated", True),
        variant=meta.get("variant", "standard"),
    )
    return True


def retry_all_waiting_pools() -> int:
    """Scanne les pools Redis et tente le pairing (Celery 2 s)."""
    if not mmr.is_redis_matchmaking_available():
        return 0
    from .services import MatchmakingService

    svc = MatchmakingService()
    client = mmr._get_client()
    try:
        waiting = list(client.smembers(mmr.WAITING_SET))
    except Exception as exc:
        logger.warning("retry_all_waiting_pools: %s", exc)
        return 0

    paired = 0
    for uid_str in waiting:
        try:
            if try_pair_waiting_user(int(uid_str), svc):
                paired += 1
        except Exception as exc:
            logger.warning("try_pair_waiting_user(%s): %s", uid_str, exc)
    return paired


def pool_stats() -> dict[str, Any]:
    """Stats pools pour monitoring / UI."""
    total = mmr.searching_count()
    pg = MatchmakingQueue.objects.count()
    by_mode: dict[str, int] = {}
    for row in MatchmakingQueue.objects.values("mode").distinct():
        mode = row["mode"]
        by_mode[mode] = MatchmakingQueue.objects.filter(mode=mode).count()
    shadow_profiles = 0
    redis_shadow = 0
    if mmr.is_redis_matchmaking_available():
        redis_shadow = mmr.shadow_searching_count()
    from .models import FairPlayIntegrityProfile

    shadow_profiles = FairPlayIntegrityProfile.objects.filter(shadow_pool=True).count()
    return {
        "redis_waiting": total,
        "redis_waiting_shadow": redis_shadow,
        "postgres_queue": pg,
        "shadow_pool_profiles": shadow_profiles,
        "by_mode": by_mode,
    }
