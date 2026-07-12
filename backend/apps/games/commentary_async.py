"""Génération de commentaires de coups (live rapide + option engine)."""
from __future__ import annotations

import logging
import threading
from typing import Any

from django.db import transaction

logger = logging.getLogger(__name__)

CommentSpec = dict[str, Any]

# Profondeur Stockfish — uniquement si use_engine=True (pas pour le live)
COMMENTARY_DEPTH = 8


def generate_move_comments_for_specs(
    specs: list[CommentSpec],
    *,
    use_engine: bool = False,
) -> int:
    """Enregistre les commentaires pour chaque coup.

    Live (défaut) : heuristiques matérielles — instantané, sans Stockfish.
    use_engine=True : analyse Stockfish (lourd, réservé aux jobs async optionnels).
    """
    if not specs:
        return 0

    from apps.games.commentary import generate_move_comment
    from apps.games.models import Move

    engine = None
    if use_engine:
        from apps.games.engine import ChessEngineService

        engine = ChessEngineService()

    updated = 0

    for spec in specs:
        move_id = spec.get("move_id")
        if not move_id:
            continue
        try:
            move = Move.objects.get(pk=move_id)
        except Move.DoesNotExist:
            logger.warning("Commentaire : coup %s introuvable", move_id)
            continue
        if move.comment.strip():
            continue

        fen_before = spec["fen_before"]
        fen_after = spec["fen_after"]
        eval_before = None
        eval_after = None
        best_san = None

        if engine is not None:
            eval_before = engine.analyze_position(fen_before, depth=COMMENTARY_DEPTH)
            eval_after = engine.analyze_position(fen_after, depth=COMMENTARY_DEPTH)
            if not spec.get("played_by_ai"):
                best_san = engine.best_move_san(fen_before, depth=COMMENTARY_DEPTH)

        text = generate_move_comment(
            fen_before,
            spec["uci"],
            spec["san"],
            played_by_ai=spec["played_by_ai"],
            mover_is_white=spec["mover_is_white"],
            move_number=spec["move_number"],
            eval_before=eval_before,
            eval_after=eval_after,
            best_san=best_san,
        )
        Move.objects.filter(pk=move_id).update(comment=text)
        updated += 1

    return updated


def apply_live_move_comments(specs: list[CommentSpec]) -> int:
    """Commentaires live immédiats (sans Stockfish) — à appeler avant la réponse HTTP."""
    return generate_move_comments_for_specs(specs, use_engine=False)


def _dispatch_comment_generation(game_id: str, specs: list[CommentSpec]) -> None:
    """Repli async (ancien chemin Celery) — toujours sans engine pour rester rapide."""
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
            kwargs={"use_engine": False},
            daemon=True,
            name=f"move-comments-{game_id[:8]}",
        ).start()


def schedule_move_comments(game_id: str, specs: list[CommentSpec]) -> None:
    """Repli : planifie après commit si la génération sync n'a pas été faite."""
    if not specs:
        return
    payload = [dict(spec) for spec in specs]
    transaction.on_commit(lambda: _dispatch_comment_generation(game_id, payload))
