"""Helpers tests matchmaking — Redis persiste entre tests Django."""

from apps.games import matchmaking_redis as mmr
from apps.games.models import MatchmakingQueue


def reset_matchmaking_state() -> None:
    MatchmakingQueue.objects.all().delete()
    mmr.flush_all_pools()
    mmr.reset_availability_cache()
