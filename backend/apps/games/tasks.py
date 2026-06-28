"""Tâches Celery — matchmaking automatique et forfeits."""

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import Game, GameRoom, MatchmakingQueue, GameAnalysis, AnalysisJob
from .services import GameService, MatchmakingService

logger = logging.getLogger(__name__)


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
    if game.white_player and game.black_player and game.is_rated:
        GameService().rating_service.update_ratings(game)
    from .stats_service import on_game_completed

    on_game_completed(game)
    if game.tournament_id:
        try:
            from apps.tournaments.services import TournamentEngine

            TournamentEngine().record_result(game)
        except Exception:
            pass


@shared_task
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


@shared_task
def analyze_game_async(game_id: str, job_id: int):
    """Analyse cloud profonde en arrière-plan."""
    from django.utils import timezone

    from apps.games.analysis_utils import compute_accuracies
    from apps.games.engine import ChessEngineService
    from apps.learning.review_nlg import generate_game_review

    try:
        job = AnalysisJob.objects.get(pk=job_id)
    except AnalysisJob.DoesNotExist:
        return

    job.status = AnalysisJob.Status.RUNNING
    job.save(update_fields=["status"])

    try:
        game = Game.objects.get(id=game_id)
        move_rows = list(game.moves.order_by("move_number").values_list("uci", "played_by_white"))
        engine = ChessEngineService()
        evaluations = engine.analyze_game_moves(move_rows, depth=job.depth)
        if not evaluations:
            raise RuntimeError("Engine returned no evaluations")

        blunders_w = sum(
            1 for i, e in enumerate(evaluations) if e.classification == "blunder" and move_rows[i][1]
        )
        blunders_b = sum(
            1 for i, e in enumerate(evaluations) if e.classification == "blunder" and not move_rows[i][1]
        )
        acc_w, acc_b = compute_accuracies(evaluations, move_rows)
        best_moves_json = [
            {
                "uci": e.uci,
                "san": e.san,
                "eval": e.eval_after,
                "eval_before": e.eval_before,
                "class": e.classification,
                "cp_loss": e.centipawn_loss,
                "played_by_white": move_rows[i][1],
                "best_uci": e.best_uci,
                "best_san": e.best_san,
                "pv_san": e.pv_san,
            }
            for i, e in enumerate(evaluations)
        ]
        summary_fr, key_moments = generate_game_review(
            best_moves_json,
            accuracy_white=acc_w,
            accuracy_black=acc_b,
            blunders_white=blunders_w,
            blunders_black=blunders_b,
        )
        GameAnalysis.objects.update_or_create(
            game=game,
            defaults={
                "accuracy_white": acc_w,
                "accuracy_black": acc_b,
                "blunders_white": blunders_w,
                "blunders_black": blunders_b,
                "best_moves_json": best_moves_json,
                "summary_fr": summary_fr,
                "key_moments_json": key_moments,
            },
        )
        job.status = AnalysisJob.Status.COMPLETED
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "completed_at"])
    except Exception as exc:
        job.status = AnalysisJob.Status.FAILED
        job.error = str(exc)[:500]
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error", "completed_at"])


@shared_task
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
    for player in (game.white_player, game.black_player):
        if player:
            analyze_and_store(game, player)


def schedule_fairplay_analysis(game_id: str) -> None:
    try:
        analyze_fairplay_async.delay(game_id)
    except Exception:
        analyze_fairplay_async(game_id)


@shared_task
def generate_move_comments_async(game_id: str, specs: list[dict]):
    """Commentaires coach/IA après un coup — ne bloque pas la réponse move."""
    try:
        from apps.games.commentary_async import generate_move_comments_for_specs

        count = generate_move_comments_for_specs(specs)
        logger.info("Commentaires async game=%s : %d coup(s) commenté(s)", game_id, count)
    except Exception:
        logger.exception("Échec génération commentaires async (game=%s)", game_id)

