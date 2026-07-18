"""Analyse Stockfish partagée — sync, async et auto post-partie."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from apps.users.premium_utils import (
    FREE_ANALYSIS_DEPTH,
    FREE_AUTO_ANALYSIS_DEPTH,
    analysis_engine_depth,
    auto_analysis_engine_depth,
    max_analysis_moves,
)

if TYPE_CHECKING:
    from .models import Game, GameAnalysis

logger = logging.getLogger(__name__)


def reference_user_for_analysis(game: Game):
    """Joueur humain de référence pour profondeur / limite de coups."""
    if game.is_vs_ai:
        return game.white_player
    users = [u for u in (game.white_player, game.black_player) if u]
    if not users:
        return None
    return max(users, key=lambda u: max_analysis_moves(u))


def analysis_params_for_game(game: Game) -> tuple[int | None, int]:
    """Retourne (move_limit, engine_depth) — move_limit None = partie entière."""
    users = []
    if game.white_player_id:
        users.append(game.white_player)
    if game.black_player_id:
        users.append(game.black_player)
    if not users:
        return None, FREE_ANALYSIS_DEPTH
    depth = max(analysis_engine_depth(u) for u in users)
    return None, depth


def auto_analysis_params_for_game(game: Game) -> tuple[int | None, int]:
    """Paramètres rapides pour l'analyse auto post-partie."""
    users = []
    if game.white_player_id:
        users.append(game.white_player)
    if game.black_player_id:
        users.append(game.black_player)
    if not users:
        return None, FREE_AUTO_ANALYSIS_DEPTH
    depth = max(auto_analysis_engine_depth(u) for u in users)
    return None, depth


def move_rows_for_game(game: Game, limit: int | None) -> list[tuple[str, bool]]:
    rows = list(
        game.moves.order_by("move_number").values_list("uci", "played_by_white")
    )
    if limit is None:
        return rows
    return rows[:limit]


def build_and_save_game_analysis(
    game: Game,
    *,
    depth: int,
    move_limit: int | None = None,
    movetime_ms: int | None = None,
    include_deep_review: bool = True,
) -> GameAnalysis | None:
    """Exécute Stockfish et persiste GameAnalysis. Retourne None si échec."""
    from apps.games.engine import ChessEngineService
    from apps.learning.review_nlg import generate_game_review

    from .analysis_utils import (
        compute_accuracies,
        compute_estimated_elos,
        compute_move_accuracies,
    )
    from .models import GameAnalysis
    from .review_phases import build_analyzed_moves_json

    move_rows = move_rows_for_game(game, move_limit)
    if not move_rows:
        return None

    engine = ChessEngineService()
    evaluations = engine.analyze_game_moves(
        move_rows, depth=depth, movetime_ms=movetime_ms
    )
    if not evaluations:
        logger.warning("Auto analysis: engine returned nothing for game %s", game.id)
        return None

    blunders_w = sum(
        1 for i, e in enumerate(evaluations) if e.classification == "blunder" and move_rows[i][1]
    )
    blunders_b = sum(
        1
        for i, e in enumerate(evaluations)
        if e.classification == "blunder" and not move_rows[i][1]
    )
    acc_w, acc_b = compute_accuracies(evaluations, move_rows)
    move_acc_w, move_acc_b = compute_move_accuracies(evaluations, move_rows)
    est_elo_w, est_elo_b = compute_estimated_elos(move_acc_w, move_acc_b, move_rows)
    best_moves_json = build_analyzed_moves_json(evaluations, move_rows)
    summary_fr, summary_en, key_moments = generate_game_review(
        best_moves_json,
        accuracy_white=acc_w,
        accuracy_black=acc_b,
        blunders_white=blunders_w,
        blunders_black=blunders_b,
    )
    from .deep_review_service import build_deep_review
    from .fairplay_integrity import integrity_hints_for_user

    ref_user = reference_user_for_analysis(game)
    hints = integrity_hints_for_user(game, ref_user) if ref_user else None
    deep_review_json = None
    if include_deep_review:
        deep_review_json = build_deep_review(
            best_moves_json,
            accuracy_white=acc_w,
            accuracy_black=acc_b,
            depth=depth,
            integrity_hints=hints,
        )

    analysis, _ = GameAnalysis.objects.update_or_create(
        game=game,
        defaults={
            "accuracy_white": acc_w,
            "accuracy_black": acc_b,
            "move_accuracy_white": move_acc_w,
            "move_accuracy_black": move_acc_b,
            "est_elo_white": est_elo_w,
            "est_elo_black": est_elo_b,
            "blunders_white": blunders_w,
            "blunders_black": blunders_b,
            "best_moves_json": best_moves_json,
            "summary_fr": summary_fr,
            "summary_en": summary_en,
            "key_moments_json": key_moments,
            "deep_review_json": deep_review_json,
            "analysis_depth_used": depth,
        },
    )
    return analysis


def refresh_deep_review_integrity(game: Game) -> None:
    """Met à jour les signaux intégrité après rapport Fair Play."""
    from .models import GameAnalysis

    try:
        analysis = game.analysis
    except GameAnalysis.DoesNotExist:
        return
    moves = analysis.best_moves_json or []
    if not moves:
        return
    from .deep_review_service import build_deep_review
    from .fairplay_integrity import integrity_hints_for_user

    ref = reference_user_for_analysis(game)
    hints = integrity_hints_for_user(game, ref) if ref else None
    analysis.deep_review_json = build_deep_review(
        moves,
        accuracy_white=analysis.accuracy_white,
        accuracy_black=analysis.accuracy_black,
        depth=analysis.analysis_depth_used or 12,
        integrity_hints=hints,
    )
    analysis.save(update_fields=["deep_review_json", "evaluated_at"])


def analysis_covers_full_game(game: Game) -> bool:
    """Vrai si l'analyse stockée couvre tous les coups de la partie."""
    from .models import GameAnalysis

    try:
        analysis = game.analysis
    except GameAnalysis.DoesNotExist:
        return False
    moves = analysis.best_moves_json or []
    if not moves:
        return False
    return len(moves) >= game.move_count


def game_needs_auto_analysis(game: Game) -> bool:
    from django.conf import settings

    from .models import AnalysisJob, Game

    if not getattr(settings, "AUTO_GAME_ANALYSIS_ENABLED", True):
        return False
    if game.status != Game.Status.COMPLETED:
        return False
    if game.result == Game.Result.ABORTED:
        return False
    min_moves = getattr(settings, "AUTO_GAME_ANALYSIS_MIN_MOVES", 2)
    if game.move_count < min_moves:
        return False
    if analysis_covers_full_game(game):
        return False
    if AnalysisJob.objects.filter(
        game=game,
        status__in=[AnalysisJob.Status.PENDING, AnalysisJob.Status.RUNNING],
    ).exists():
        return False
    return True
