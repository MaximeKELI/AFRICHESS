"""Génération de commentaires de coups en arrière-plan (Celery ou thread)."""
from __future__ import annotations

import logging
import threading
from typing import Any

from django.db import transaction

logger = logging.getLogger(__name__)

CommentSpec = dict[str, Any]


def generate_move_comments_for_specs(specs: list[CommentSpec]) -> int:
    """Analyse Stockfish + enregistre les commentaires pour chaque coup."""
    if not specs:
        return 0

    from apps.games.commentary import generate_move_comment
    from apps.games.engine import ChessEngineService
    from apps.games.models import Move

    engine = ChessEngineService()
    updated = 0

    for spec in specs:
        move_id = spec.get("move_id")
        if not move_id:
            continue
        try:
            move = Move.objects.get(pk=move_id)
        except Move.DoesNotExist:
            logger.warning("Commentaire async : coup %s introuvable", move_id)
            continue
        if move.comment.strip():
            continue

        eval_before = engine.analyze_position(spec["fen_before"], depth=10)
        eval_after = engine.analyze_position(spec["fen_after"], depth=10)
        text = generate_move_comment(
            spec["fen_before"],
            spec["uci"],
            spec["san"],
            played_by_ai=spec["played_by_ai"],
            mover_is_white=spec["mover_is_white"],
            move_number=spec["move_number"],
            eval_before=eval_before,
            eval_after=eval_after,
        )
        Move.objects.filter(pk=move_id).update(comment=text)
        updated += 1

    return updated


def _dispatch_comment_generation(game_id: str, specs: list[CommentSpec]) -> None:
    try:
        from apps.games.tasks import generate_move_comments_async

        generate_move_comments_async.delay(game_id, specs)
        logger.debug("Commentaires async Celery planifiés (game=%s, n=%d)", game_id, len(specs))
    except Exception as exc:
        logger.warning(
            "Celery indisponible pour commentaires (game=%s) — repli thread : %s",
            game_id,
            exc,
        )
        threading.Thread(
            target=generate_move_comments_for_specs,
            args=(specs,),
            daemon=True,
            name=f"move-comments-{game_id[:8]}",
        ).start()


def schedule_move_comments(game_id: str, specs: list[CommentSpec]) -> None:
    """Planifie la génération après commit DB (réponse HTTP non bloquée)."""
    if not specs:
        return
    payload = [dict(spec) for spec in specs]
    transaction.on_commit(lambda: _dispatch_comment_generation(game_id, payload))
