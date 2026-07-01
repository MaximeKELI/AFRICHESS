"""File d'attente matchmaking Redis — pairing atomique (<500 ms)."""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import redis
from django.conf import settings

logger = logging.getLogger(__name__)

USER_KEY_PREFIX = "mm:user:"
WAITING_SET = "mm:waiting"
WAITING_COUNT = "mm:waiting_count"
USER_TTL_SECONDS = 600

MATCH_OR_ENQUEUE_LUA = f"""
local pool = KEYS[1]
local user_id = ARGV[1]
local elo = tonumber(ARGV[2])
local elo_min = tonumber(ARGV[3])
local elo_max = tonumber(ARGV[4])
local joined_at = ARGV[5]
local meta_json = ARGV[6]
local enqueue_flag = ARGV[7]
local user_key = ARGV[8]

local old_pool = redis.call('HGET', user_key, 'pool')
if old_pool and old_pool ~= pool then
  redis.call('ZREM', old_pool, user_id)
end

local candidates = redis.call('ZRANGEBYSCORE', pool, elo_min, elo_max)
local best = nil
local best_diff = 999999
local best_joined = nil

for i, cid in ipairs(candidates) do
  if cid ~= user_id then
    local cid_elo = tonumber(redis.call('ZSCORE', pool, cid))
    if cid_elo then
      local cid_joined = redis.call('HGET', 'mm:user:' .. cid, 'joined_at') or ''
      local diff = math.abs(cid_elo - elo)
      if diff < best_diff or (diff == best_diff and cid_joined < (best_joined or 'z')) then
        best = cid
        best_diff = diff
        best_joined = cid_joined
      end
    end
  end
end

if best then
  redis.call('ZREM', pool, best)
  redis.call('ZREM', pool, user_id)
  redis.call('DEL', 'mm:user:' .. best)
  redis.call('DEL', user_key)
  local removed_best = redis.call('SREM', '{WAITING_SET}', best)
  if removed_best == 1 then
    local cnt = redis.call('GET', '{WAITING_COUNT}')
    if cnt and tonumber(cnt) > 0 then redis.call('DECR', '{WAITING_COUNT}') end
  end
  local removed_self = redis.call('SREM', '{WAITING_SET}', user_id)
  if removed_self == 1 then
    local cnt = redis.call('GET', '{WAITING_COUNT}')
    if cnt and tonumber(cnt) > 0 then redis.call('DECR', '{WAITING_COUNT}') end
  end
  return {{best, 'paired'}}
end

if enqueue_flag == '0' then
  return {{'waiting'}}
end

redis.call('ZADD', pool, elo, user_id)
redis.call('HSET', user_key, 'pool', pool, 'elo', elo, 'joined_at', joined_at, 'meta', meta_json)
redis.call('EXPIRE', user_key, {USER_TTL_SECONDS})
local was_waiting = redis.call('SISMEMBER', '{WAITING_SET}', user_id)
redis.call('SADD', '{WAITING_SET}', user_id)
if was_waiting == 0 then
  redis.call('INCR', '{WAITING_COUNT}')
end
return {{'waiting'}}
"""

LEAVE_QUEUE_LUA = f"""
local user_key = KEYS[1]
local user_id = ARGV[1]
local pool = redis.call('HGET', user_key, 'pool')
if pool then
  redis.call('ZREM', pool, user_id)
end
redis.call('DEL', user_key)
local was = redis.call('SREM', '{WAITING_SET}', user_id)
if was == 1 then
  local cnt = redis.call('GET', '{WAITING_COUNT}')
  if cnt and tonumber(cnt) > 0 then
    redis.call('DECR', '{WAITING_COUNT}')
  end
end
return 1
"""


@dataclass
class MatchmakingRedisResult:
    status: str  # "paired" | "waiting"
    opponent_id: int | None = None


def pool_key(
    *,
    mode: str,
    variant: str,
    is_timed: bool,
    is_rated: bool,
    time_control: str,
    time_control_minutes: int | None,
) -> str:
    prefix = getattr(settings, "MATCHMAKING_REDIS_PREFIX", "mm:pool")
    tcm = time_control_minutes if time_control_minutes is not None else "none"
    tc = time_control or ""
    return (
        f"{prefix}:{mode}:{variant}:"
        f"{'t' if is_timed else 'u'}:{'r' if is_rated else 'c'}:{tcm}:{tc}"
    )


def _redis_client() -> redis.Redis:
    url = getattr(settings, "REDIS_URL", "redis://127.0.0.1:6379/0")
    parsed = urlparse(url)
    db = int((parsed.path or "/0").lstrip("/") or 0)
    return redis.Redis(
        host=parsed.hostname or "127.0.0.1",
        port=parsed.port or 6379,
        password=parsed.password,
        db=db,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )


_client: redis.Redis | None = None
_available: bool | None = None
_match_script = None
_leave_script = None


def redis_matchmaking_enabled() -> bool:
    return getattr(settings, "MATCHMAKING_REDIS_ENABLED", True)


def is_redis_matchmaking_available() -> bool:
    global _available, _client
    if not redis_matchmaking_enabled():
        return False
    if _available is not None:
        return _available
    try:
        _client = _redis_client()
        _client.ping()
        _available = True
    except Exception as exc:
        logger.warning("Redis matchmaking unavailable — fallback PostgreSQL: %s", exc)
        _available = False
    return _available


def _get_client() -> redis.Redis:
    global _client, _match_script, _leave_script
    if _client is None:
        _client = _redis_client()
    if _match_script is None:
        _match_script = _client.register_script(MATCH_OR_ENQUEUE_LUA)
    if _leave_script is None:
        _leave_script = _client.register_script(LEAVE_QUEUE_LUA)
    return _client


def match_or_enqueue(
    *,
    user_id: int,
    elo: int,
    pool: str,
    meta: dict[str, Any],
    elo_range: int,
    enqueue_if_no_match: bool = True,
) -> MatchmakingRedisResult | None:
    """Pairing atomique Redis. Retourne None si Redis indisponible."""
    if not is_redis_matchmaking_available():
        return None
    try:
        joined_at = str(time.time())
        elo_min = elo - elo_range
        elo_max = elo + elo_range
        user_key = f"{USER_KEY_PREFIX}{user_id}"
        result = _get_client().register_script(MATCH_OR_ENQUEUE_LUA)(
            keys=[pool],
            args=[
                str(user_id),
                str(elo),
                str(elo_min),
                str(elo_max),
                joined_at,
                json.dumps(meta, separators=(",", ":")),
                "1" if enqueue_if_no_match else "0",
                user_key,
            ],
        )
        if not result:
            return MatchmakingRedisResult(status="waiting")
        if len(result) >= 2 and result[1] == "paired":
            return MatchmakingRedisResult(status="paired", opponent_id=int(result[0]))
        return MatchmakingRedisResult(status="waiting")
    except Exception as exc:
        logger.warning("Redis match_or_enqueue failed: %s", exc)
        return None


def leave_user(user_id: int) -> bool:
    if not is_redis_matchmaking_available():
        return False
    try:
        user_key = f"{USER_KEY_PREFIX}{user_id}"
        _get_client().register_script(LEAVE_QUEUE_LUA)(keys=[user_key], args=[str(user_id)])
        return True
    except Exception as exc:
        logger.warning("Redis leave_user failed: %s", exc)
        return False


def searching_count() -> int:
    if not is_redis_matchmaking_available():
        return 0
    try:
        raw = _get_client().get(WAITING_COUNT)
        return max(0, int(raw or 0))
    except Exception:
        return 0


def reset_availability_cache() -> None:
    """Tests only — force re-probe Redis."""
    global _available, _client, _match_script, _leave_script
    _available = None
    _client = None
    _match_script = None
    _leave_script = None
