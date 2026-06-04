"""Tâches Celery — matchmaking automatique et forfeits."""

from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import Game, GameRoom, MatchmakingQueue
from .services import GameService, MatchmakingService


@shared_task
def pair_matchmaking_queues():
    """Apparie les joueurs en file sans action manuelle des deux côtés."""
    MatchmakingService().pair_all_waiting()


@shared_task
def forfeit_disconnected_games():
    """Victoire si adversaire déconnecté > 90 secondes."""
    cutoff = timezone.now() - timedelta(seconds=90)
    for room in GameRoom.objects.select_related("game").filter(
        game__status=Game.Status.ACTIVE,
        game__is_vs_ai=False,
    ):
        game = room.game
        if room.white_disconnected_at and room.white_disconnected_at < cutoff:
            if room.black_connected:
                _award_forfeit(game, winner_white=False, reason="disconnect")
        elif room.black_disconnected_at and room.black_disconnected_at < cutoff:
            if room.white_connected:
                _award_forfeit(game, winner_white=True, reason="disconnect")


def _award_forfeit(game: Game, winner_white: bool, reason: str):
    if game.status != Game.Status.ACTIVE:
        return
    game.result = Game.Result.WHITE_WIN if winner_white else Game.Result.BLACK_WIN
    game.winner = game.white_player if winner_white else game.black_player
    game.status = Game.Status.COMPLETED
    game.termination_reason = reason
    game.ended_at = timezone.now()
    game.save()
    if game.white_player and game.black_player:
        GameService().rating_service.update_ratings(game)
