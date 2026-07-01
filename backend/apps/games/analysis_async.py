"""Planification analyse async avec repli thread si Celery indisponible."""

from __future__ import annotations

import logging
import threading

logger = logging.getLogger(__name__)


def run_analyze_game_job(game_id: str, job_id: int) -> None:
    """Exécute une analyse cloud (même logique que la tâche Celery)."""
    from django.utils import timezone

    from apps.games.analysis_utils import compute_accuracies, compute_move_accuracies
    from apps.games.engine import ChessEngineService
    from apps.games.models import AnalysisJob, Game, GameAnalysis
    from apps.learning.review_nlg import generate_game_review

    try:
        job = AnalysisJob.objects.select_related("user").get(pk=job_id)
    except AnalysisJob.DoesNotExist:
        return

    job.status = AnalysisJob.Status.RUNNING
    job.save(update_fields=["status"])

    try:
        game = Game.objects.get(id=game_id)
        from apps.users.premium_utils import max_analysis_moves

        limit = max_analysis_moves(job.user)
        move_rows = list(
            game.moves.order_by("move_number").values_list("uci", "played_by_white")
        )[:limit]
        if not move_rows:
            raise RuntimeError("No moves to analyze")
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
        move_acc_w, move_acc_b = compute_move_accuracies(evaluations, move_rows)
        from .review_phases import build_analyzed_moves_json

        best_moves_json = build_analyzed_moves_json(evaluations, move_rows)
        summary_fr, summary_en, key_moments = generate_game_review(
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
                "move_accuracy_white": move_acc_w,
                "move_accuracy_black": move_acc_b,
                "blunders_white": blunders_w,
                "blunders_black": blunders_b,
                "best_moves_json": best_moves_json,
                "summary_fr": summary_fr,
                "summary_en": summary_en,
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
