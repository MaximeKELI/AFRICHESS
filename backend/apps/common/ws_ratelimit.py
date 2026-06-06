"""Rate limiting léger pour WebSockets."""

from django.core.cache import cache


def allow_ws_event(user_id: int, channel: str, limit: int = 60, window: int = 60) -> bool:
    key = f"ws_rl:{user_id}:{channel}"
    cache.add(key, 0, timeout=window)
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=window)
        return True
    return count <= limit
