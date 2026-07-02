"""Client API Opening Explorer Lichess (https://lichess.org/api#tag/Opening-Explorer)."""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

EXPLORER_BASE = getattr(
    settings, "LICHESS_EXPLORER_URL", "https://explorer.lichess.ovh"
)
CACHE_TTL = getattr(settings, "LICHESS_EXPLORER_CACHE_SECONDS", 3600)


def fetch_opening_explorer(
    fen: str,
    *,
    source: str = "lichess",
    ratings: list[int] | None = None,
    speeds: list[str] | None = None,
    since: str | None = None,
    until: str | None = None,
    moves: int = 12,
    top_games: int = 4,
) -> dict[str, Any] | None:
    """
    source: 'lichess' (parties Lichess) ou 'masters' (parties titrés).
    Retourne le JSON explorer ou None si indisponible.
    """
    if not fen or len(fen) > 120:
        return None

    params: dict[str, Any] = {
        "fen": fen,
        "moves": moves,
        "topGames": top_games,
    }
    if ratings:
        params["ratings"] = ",".join(str(r) for r in ratings)
    if speeds:
        params["speeds"] = ",".join(speeds)
    if since:
        params["since"] = since
    if until:
        params["until"] = until

    cache_key = f"lichess_explorer:{source}:{urlencode(sorted(params.items()))}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    url = f"{EXPLORER_BASE.rstrip('/')}/{source}"
    try:
        resp = requests.get(url, params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        cache.set(cache_key, data, CACHE_TTL)
        return data
    except Exception as exc:
        logger.warning("Lichess explorer fetch failed: %s", exc)
        return None


def normalize_explorer_moves(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Transforme les coups explorer en liste triée par popularité."""
    moves = data.get("moves") or []
    out = []
    for m in moves:
        out.append(
            {
                "san": m.get("san"),
                "uci": m.get("uci"),
                "white": m.get("white", 0),
                "draws": m.get("draws", 0),
                "black": m.get("black", 0),
                "average_rating": m.get("averageOpponentRating") or m.get("averageRating"),
            }
        )
    total = sum(x["white"] + x["draws"] + x["black"] for x in out) or 1
    for x in out:
        games = x["white"] + x["draws"] + x["black"]
        x["share_pct"] = round(100.0 * games / total, 1)
    out.sort(key=lambda x: x["white"] + x["draws"] + x["black"], reverse=True)
    return out
