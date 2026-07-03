"""Planification analyse async avec repli thread si Celery indisponible."""

from __future__ import annotations

import logging
import threading

logger = logging.getLogger(__name__)


def run_analyze_game_job(game_id: str, job_id: int) -> None:
    """Exécute une analyse cloud (job utilisateur premium)."""
    from django.utils import timezone

    from apps.games.models import AnalysisJob, Game
    from apps.users.premium_utils import max_analysis_moves

    from .game_analysis_service import build_and_save_game_analysis
    from .ws_notify import notify_analysis_ready

    try:
        job = AnalysisJob.objects.select_related("user").get(pk=job_id)
    except AnalysisJob.DoesNotExist:
        return

    job.status = AnalysisJob.Status.RUNNING
    job.save(update_fields=["status"])

    try:
        game = Game.objects.get(id=game_id)
        limit = max_analysis_moves(job.user)
        analysis = build_and_save_game_analysis(game, depth=job.depth, move_limit=limit)
        if not analysis:
            raise RuntimeError("No moves to analyze")
        job.status = AnalysisJob.Status.COMPLETED
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "completed_at"])
        notify_analysis_ready(game)
    except Exception as exc:
        job.status = AnalysisJob.Status.FAILED
        job.error = str(exc)[:500]
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error", "completed_at"])


def run_auto_game_analysis(game_id: str) -> None:
    """Analyse post-partie automatique (profondeur selon le tier des joueurs)."""
    from apps.games.models import Game

    from .game_analysis_service import (
        auto_analysis_params_for_game,
        build_and_save_game_analysis,
        game_needs_auto_analysis,
    )
    from .ws_notify import notify_analysis_ready

    try:
        game = Game.objects.select_related("white_player", "black_player").get(id=game_id)
    except Game.DoesNotExist:
        return
    if not game_needs_auto_analysis(game):
        return

    move_limit, depth = auto_analysis_params_for_game(game)
    from django.conf import settings

    movetime_ms = getattr(settings, "AUTO_GAME_ANALYSIS_MOVETIME_MS", 80)
    analysis = build_and_save_game_analysis(
        game,
        depth=depth,
        move_limit=move_limit,
        movetime_ms=movetime_ms,
        include_deep_review=False,
    )
    if analysis:
        logger.info("Auto game analysis saved for game %s", game_id)
        notify_analysis_ready(game)


def schedule_analyze_game(game_id: str, job_id: int) -> None:
    try:
        from apps.games.tasks import analyze_game_async

        analyze_game_async.delay(game_id, job_id)
    except Exception as exc:
        logger.warning(
            "Celery indisponible pour analyse (game=%s) — repli thread : %s",
            game_id,
            exc,
        )
        threading.Thread(
            target=run_analyze_game_job,
            args=(game_id, job_id),
            daemon=True,
            name=f"analyze-game-{game_id[:8]}",
        ).start()


def schedule_auto_game_analysis(game_id: str) -> None:
    """File Celery ou thread pour analyse post-partie."""
    try:
        from apps.games.tasks import auto_analyze_completed_game

        auto_analyze_completed_game.delay(game_id)
    except Exception as exc:
        logger.warning(
            "Celery indisponible pour auto-analyse (game=%s) — repli thread : %s",
            game_id,
            exc,
        )
        threading.Thread(
            target=run_auto_game_analysis,
            args=(game_id,),
            daemon=True,
            name=f"auto-analyze-{game_id[:8]}",
        ).start()
