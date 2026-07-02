"""Tâches Celery — matchmaking automatique et forfeits."""

import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import Game, GameRoom, MatchmakingQueue, GameAnalysis, AnalysisJob
from .services import GameService, MatchmakingService

logger = logging.getLogger(__name__)


@shared_task(queue="realtime")
def retry_matchmaking_pools():
    """Retry rapide des pools Redis (élargissement ELO)."""
    from .matchmaking_pools import retry_all_waiting_pools

    return retry_all_waiting_pools()


@shared_task(queue="realtime")
def pair_matchmaking_queues():
    """Réconciliation file matchmaking (Redis primary, PG fallback)."""
    MatchmakingService().pair_all_waiting()


@shared_task(queue="realtime")
def forfeit_disconnected_games():
    """Victoire si adversaire déconnecté au-delà du délai configuré."""
    cutoff = timezone.now() - timedelta(seconds=settings.DISCONNECT_FORFEIT_SECONDS)
    for room in GameRoom.objects.select_related("game").filter(
        game__status=Game.Status.ACTIVE,
        game__is_vs_ai=False,
    ).filter(
        Q(white_disconnected_at__lt=cutoff, black_connected=True)
        | Q(black_disconnected_at__lt=cutoff, white_connected=True)
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
    GameService()._after_human_game_finished(game)


@shared_task(queue="realtime")
def pair_correspondence_queues():
    """Apparie les joueurs en file daily chess sans nouveau join."""
    from .correspondence import CorrespondenceMatchmakingService

    service = CorrespondenceMatchmakingService()
    paired = 0
    while service._pair_waiting():
        paired += 1
    return paired


@shared_task(queue="realtime")
def forfeit_overdue_correspondence_games():
    """Forfait daily chess si échéance dépassée (hors vacances)."""
    import chess

    from .correspondence import user_on_vacation

    now = timezone.now()
    qs = Game.objects.filter(
        mode=Game.Mode.CORRESPONDENCE,
        status=Game.Status.ACTIVE,
        turn_deadline__lt=now,
    ).select_related("white_player", "black_player")

    for game in qs:
        board = chess.Board(game.fen)
        mover = game.white_player if board.turn == chess.WHITE else game.black_player
        if mover and user_on_vacation(mover):
            continue
        winner_white = board.turn != chess.WHITE
        _award_forfeit(game, winner_white=winner_white, reason="timeout")


@shared_task(queue="analysis")
def auto_analyze_completed_game(game_id: str):
    """Analyse Stockfish en arrière-plan dès qu'une partie se termine."""
    from .analysis_async import run_auto_game_analysis

    run_auto_game_analysis(game_id)


def schedule_auto_game_analysis(game_id: str) -> None:
    try:
        auto_analyze_completed_game.delay(game_id)
    except Exception:
        auto_analyze_completed_game(game_id)


@shared_task(queue="analysis")
def analyze_game_async(game_id: str, job_id: int):
    """Analyse cloud profonde en arrière-plan."""
    from .analysis_async import run_analyze_game_job

    run_analyze_game_job(game_id, job_id)


@shared_task(queue="fairplay")
def analyze_fairplay_async(game_id: str):
    """Analyse anti-triche complète (C++) pour les deux joueurs."""
    from .fairplay_service import analyze_and_store
    from .models import Game

    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return
    if game.is_vs_ai or not game.is_rated:
        return
    from .fairplay_exempt import user_is_fairplay_exempt

    for player in (game.white_player, game.black_player):
        if player and not user_is_fairplay_exempt(player):
            analyze_and_store(game, player)

    from .fairplay_auto_policy import reevaluate_game_auto_sanctions

    reevaluate_game_auto_sanctions(game)


def schedule_fairplay_analysis(game_id: str) -> None:
    try:
        analyze_fairplay_async.delay(game_id)
    except Exception:
        analyze_fairplay_async(game_id)


@shared_task(queue="fairplay")
def expire_fairplay_sanctions_task():
    """Réactive les comptes suspendus temporairement et expire les sanctions."""
    from .fairplay_review import expire_fairplay_sanctions

    return expire_fairplay_sanctions()


@shared_task(queue="fairplay")
def refresh_fairplay_scale_metrics():
    """Met à jour les gauges Prometheus AIE / shadow pools."""
    from .fairplay_scale import refresh_prometheus_fairplay_metrics

    return refresh_prometheus_fairplay_metrics()


@shared_task(queue="fairplay")
def batch_sync_shadow_pools_task():
    """Réconciliation batch shadow pool (AIE à l'échelle)."""
    from .fairplay_scale import batch_sync_shadow_pools

    return batch_sync_shadow_pools()


@shared_task(queue="analysis")
def generate_move_comments_async(game_id: str, specs: list[dict]):
    """Commentaires coach/IA après un coup — ne bloque pas la réponse move."""
    try:
        from apps.games.commentary_async import generate_move_comments_for_specs

        count = generate_move_comments_for_specs(specs)
        logger.info("Commentaires async game=%s : %d coup(s) commenté(s)", game_id, count)
    except Exception:
        logger.exception("Échec génération commentaires async (game=%s)", game_id)

