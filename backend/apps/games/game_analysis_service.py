"""Analyse Stockfish partagée — sync, async et auto post-partie."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from apps.users.premium_utils import (
    FREE_ANALYSIS_MOVES,
    analysis_engine_depth,
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


def analysis_params_for_game(game: Game) -> tuple[int, int]:
    """Retourne (move_limit, engine_depth) en tenant compte des deux joueurs."""
    users = []
    if game.white_player_id:
        users.append(game.white_player)
    if game.black_player_id:
        users.append(game.black_player)
    if not users:
        return FREE_ANALYSIS_MOVES, 12
    limit = max(max_analysis_moves(u) for u in users)
    depth = max(analysis_engine_depth(u) for u in users)
    return limit, depth


def move_rows_for_game(game: Game, limit: int) -> list[tuple[str, bool]]:
    return list(
        game.moves.order_by("move_number").values_list("uci", "played_by_white")
    )[:limit]


def build_and_save_game_analysis(game: Game, *, depth: int, move_limit: int) -> GameAnalysis | None:
    """Exécute Stockfish et persiste GameAnalysis. Retourne None si échec."""
    from apps.games.engine import ChessEngineService
    from apps.learning.review_nlg import generate_game_review

    from .analysis_utils import compute_accuracies, compute_move_accuracies
    from .models import GameAnalysis
    from .review_phases import build_analyzed_moves_json

    move_rows = move_rows_for_game(game, move_limit)
    if not move_rows:
        return None

    engine = ChessEngineService()
    evaluations = engine.analyze_game_moves(move_rows, depth=depth)
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
    best_moves_json = build_analyzed_moves_json(evaluations, move_rows)
    summary_fr, summary_en, key_moments = generate_game_review(
        best_moves_json,
        accuracy_white=acc_w,
        accuracy_black=acc_b,
        blunders_white=blunders_w,
        blunders_black=blunders_b,
    )

    analysis, _ = GameAnalysis.objects.update_or_create(
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
    return analysis


def game_needs_auto_analysis(game: Game) -> bool:
    from django.conf import settings

    from .models import AnalysisJob, Game, GameAnalysis

    if not getattr(settings, "AUTO_GAME_ANALYSIS_ENABLED", True):
        return False
    if game.status != Game.Status.COMPLETED:
        return False
    if game.result == Game.Result.ABORTED:
        return False
    min_moves = getattr(settings, "AUTO_GAME_ANALYSIS_MIN_MOVES", 2)
    if game.move_count < min_moves:
        return False
    try:
        if game.analysis.best_moves_json:
            return False
    except GameAnalysis.DoesNotExist:
        pass
    if GameAnalysis.objects.filter(game=game).exclude(best_moves_json=[]).exists():
        return False
    if AnalysisJob.objects.filter(
        game=game,
        status__in=[AnalysisJob.Status.PENDING, AnalysisJob.Status.RUNNING],
    ).exists():
        return False
    return True
