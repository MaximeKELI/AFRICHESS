"""Lookups ELO batch — évite N+1 dans les sérialiseurs de parties."""

from __future__ import annotations

from apps.ratings.models import PlayerRating
from apps.ratings.provisional import is_provisional


def batch_player_ratings(games) -> dict[tuple[int, str], dict]:
    """{(user_id, mode): {elo, is_provisional}} en une requête."""
    from apps.games.serializers import _game_rating_mode

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
    return {
        (r.user_id, r.mode): {
            "elo": r.elo,
            "is_provisional": is_provisional(r),
        }
        for r in ratings
    }
