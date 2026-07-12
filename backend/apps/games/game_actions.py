"""Actions de partie : nulle, rematch, takeback, abort, liste live."""

from django.db import transaction
from django.utils import timezone

from .models import Game
from .room_utils import ensure_game_room
from .services import GameService
from .time_control import resolve_time_fields
from .variant_utils import board_from_fen, starting_position_for_variant

ABORT_WINDOW_SECONDS = 60


def _participant(game: Game, user) -> bool:
    return user.id in (game.white_player_id, game.black_player_id)


def _clear_pending_offers(game: Game) -> None:
    game.draw_offered_by = None
    game.takeback_requested_by = None


def can_abort_game(game: Game) -> bool:
    if game.status != Game.Status.ACTIVE or game.is_vs_ai:
        return False
    if game.move_count >= 2:
        return False
    if not game.started_at:
        return game.move_count == 0
    elapsed = (timezone.now() - game.started_at).total_seconds()
    return elapsed < ABORT_WINDOW_SECONDS


def abort_game(game: Game, user) -> dict:
    if not _participant(game, user):
        return {"error": "Non participant"}
    if not can_abort_game(game):
        return {"error": "Abort impossible (délai dépassé ou coups joués)"}
    game.status = Game.Status.ABORTED
    game.result = Game.Result.ABORTED
    game.ended_at = timezone.now()
    game.termination_reason = "aborted_by_agreement"
    _clear_pending_offers(game)
    game.save()
    return {"ok": True, "status": "aborted"}


def offer_takeback(game: Game, user) -> dict:
    if game.status != Game.Status.ACTIVE or game.is_vs_ai or game.is_rated:
        return {"error": "Reprise réservée aux parties amicales"}
    if not _participant(game, user):
        return {"error": "Non participant"}
    if game.move_count < 1:
        return {"error": "Aucun coup à reprendre"}
    game.takeback_requested_by = user
    game.save(update_fields=["takeback_requested_by"])
    return {"ok": True, "requested_by": user.id}


def _rebuild_fen_from_moves(game: Game) -> str:
    if game.chess960_position_id is not None:
        import chess

        start_fen = chess.Board.from_chess960_pos(game.chess960_position_id).fen()
    else:
        start_fen, _ = starting_position_for_variant(game.variant)
    board = board_from_fen(start_fen, game.variant)
    for m in game.moves.order_by("move_number"):
        board.push_uci(m.uci)
    return board.fen()


def accept_takeback(game: Game, user) -> dict:
    if not game.takeback_requested_by_id or game.takeback_requested_by_id == user.id:
        return {"error": "Aucune demande adverse"}
    if not _participant(game, user):
        return {"error": "Non participant"}
    if game.status != Game.Status.ACTIVE or game.is_rated or game.is_vs_ai:
        return {"error": "Reprise impossible"}
    last = game.moves.order_by("-move_number").first()
    if not last:
        game.takeback_requested_by = None
        game.save(update_fields=["takeback_requested_by"])
        return {"error": "Aucun coup à reprendre"}
    last.delete()
    game.fen = _rebuild_fen_from_moves(game)
    game.move_count = game.moves.count()
    _clear_pending_offers(game)
    from .draw_rules import rebuild_repetition_counts

    game.repetition_counts = rebuild_repetition_counts(game)
    game.turn_started_at = timezone.now() if game.is_timed else game.turn_started_at
    game.save(
        update_fields=[
            "fen",
            "move_count",
            "takeback_requested_by",
            "draw_offered_by",
            "repetition_counts",
            "turn_started_at",
        ]
    )
    return {"ok": True, "undone": 1}


def decline_takeback(game: Game, user) -> dict:
    if not _participant(game, user):
        return {"error": "Non participant"}
    game.takeback_requested_by = None
    game.save(update_fields=["takeback_requested_by"])
    return {"ok": True}


def offer_draw(game: Game, user) -> dict:
    if game.status != Game.Status.ACTIVE or game.is_vs_ai:
        return {"error": "Impossible"}
    if not _participant(game, user):
        return {"error": "Non participant"}
    game.draw_offered_by = user
    game.save(update_fields=["draw_offered_by"])
    return {"ok": True, "offered_by": user.id}


def accept_draw(game: Game, user) -> dict:
    if game.status != Game.Status.ACTIVE:
        return {"error": "Partie terminée"}
    if not game.draw_offered_by_id or game.draw_offered_by_id == user.id:
        return {"error": "Aucune proposition adverse"}
    if not _participant(game, user):
        return {"error": "Non participant"}
    game.result = Game.Result.DRAW
    game.status = Game.Status.COMPLETED
    game.ended_at = timezone.now()
    game.termination_reason = "draw_agreement"
    _clear_pending_offers(game)
    game.save()
    GameService()._after_human_game_finished(game)
    return {"ok": True, "result": "1/2-1/2"}


def decline_draw(game: Game, user) -> dict:
    if not _participant(game, user):
        return {"error": "Non participant"}
    game.draw_offered_by = None
    game.save(update_fields=["draw_offered_by"])
    return {"ok": True}


def claim_draw(game: Game, user) -> dict:
    """Réclame une nulle par triple répétition ou règle des 50 coups."""
    from .draw_rules import (
        can_claim_fifty_moves_from_game,
        can_claim_threefold_from_game,
        finalize_repetition_draw,
    )

    if game.status != Game.Status.ACTIVE:
        return {"error": "Partie terminée"}
    if not _participant(game, user):
        return {"error": "Non participant"}
    if can_claim_threefold_from_game(game):
        finalize_repetition_draw(game)
        game.save()
        GameService()._after_human_game_finished(game)
        return {
            "ok": True,
            "result": game.result,
            "termination_reason": "repetition",
            "draw_claim": "threefold",
        }
    if can_claim_fifty_moves_from_game(game):
        game.result = Game.Result.DRAW
        game.status = Game.Status.COMPLETED
        game.ended_at = timezone.now()
        game.termination_reason = "fifty_move"
        game.winner = None
        _clear_pending_offers(game)
        game.save()
        GameService()._after_human_game_finished(game)
        return {
            "ok": True,
            "result": game.result,
            "termination_reason": "fifty_move",
            "draw_claim": "fifty_move",
        }
    return {"error": "Aucune nulle à réclamer"}


def claim_flag(game: Game, user) -> dict:
    """Déclare le flag (temps écoulé) côté serveur — appelable par n'importe quel participant."""
    from .clock_service import apply_server_clock_before_move, check_timeout

    if game.status != Game.Status.ACTIVE:
        return {
            "ok": True,
            "result": game.result,
            "termination_reason": game.termination_reason,
            "already_finished": True,
        }
    if not _participant(game, user):
        return {"error": "Non participant"}
    if not game.is_timed or game.mode == Game.Mode.CORRESPONDENCE:
        return {"error": "Partie sans horloge"}

    apply_server_clock_before_move(game)
    timed_out = check_timeout(game)
    if not timed_out:
        game.save(update_fields=["white_time_ms", "black_time_ms"])
        return {"error": "Temps encore disponible", "game_over": False}

    winner_white = timed_out == "black"
    svc = GameService()
    svc._finalize_game_on_timeout(game, winner_white=winner_white)
    game.save()
    svc._after_human_game_finished(game)
    return {
        "ok": True,
        "result": game.result,
        "termination_reason": game.termination_reason or "timeout",
        "game_over": True,
        "reason": "timeout",
    }


def resign_game(game: Game, user) -> dict:
    if game.status != Game.Status.ACTIVE:
        # Idempotent : abandon après fin (horloge / mat) → pas d'erreur front.
        return {"ok": True, "result": game.result, "already_finished": True}
    if not _participant(game, user):
        return {"error": "Non participant"}

    if game.is_vs_ai:
        # Humain abandonne vs IA
        if game.white_player_id == user.id:
            game.result = Game.Result.BLACK_WIN
            game.winner = None
        else:
            game.result = Game.Result.WHITE_WIN
            game.winner = None
    elif game.white_player_id == user.id:
        game.result = Game.Result.BLACK_WIN
        game.winner = game.black_player
    else:
        game.result = Game.Result.WHITE_WIN
        game.winner = game.white_player
    game.status = Game.Status.COMPLETED
    game.ended_at = timezone.now()
    game.termination_reason = "resignation"
    _clear_pending_offers(game)
    game.save()
    GameService()._after_human_game_finished(game)
    return {"ok": True, "result": game.result}


def set_conditional_move(game: Game, user, trigger_uci: str, response_uci: str) -> dict:
    if game.mode != Game.Mode.CORRESPONDENCE or game.status != Game.Status.ACTIVE:
        return {"error": "Coups conditionnels réservés aux parties daily"}
    if not _participant(game, user):
        return {"error": "Non participant"}
    trigger_uci = (trigger_uci or "").strip().lower()
    response_uci = (response_uci or "").strip().lower()
    if len(trigger_uci) < 4 or len(response_uci) < 4:
        return {"error": "UCI invalide"}
    conditions = [c for c in (game.conditional_moves or []) if c.get("user_id") != user.id]
    conditions.append(
        {"user_id": user.id, "trigger_uci": trigger_uci, "response_uci": response_uci}
    )
    game.conditional_moves = conditions
    game.save(update_fields=["conditional_moves"])
    return {"ok": True, "conditional_moves": game.conditional_moves}


def clear_conditional_moves(game: Game, user) -> dict:
    if not _participant(game, user):
        return {"error": "Non participant"}
    game.conditional_moves = [c for c in (game.conditional_moves or []) if c.get("user_id") != user.id]
    game.save(update_fields=["conditional_moves"])
    return {"ok": True}


def try_apply_conditional_response(game: Game, last_move_uci: str) -> dict | None:
    """Si le dernier coup adverse déclenche un coup conditionnel, joue la réponse."""
    if game.mode != Game.Mode.CORRESPONDENCE or not game.conditional_moves:
        return None
    trigger = (last_move_uci or "").strip().lower()
    for cond in game.conditional_moves:
        if cond.get("trigger_uci") != trigger:
            continue
        user_id = cond.get("user_id")
        if user_id not in (game.white_player_id, game.black_player_id):
            continue
        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            continue
        response = cond.get("response_uci")
        if not response:
            continue
        game.conditional_moves = [c for c in game.conditional_moves if c != cond]
        game.save(update_fields=["conditional_moves"])
        return GameService().make_move(game, user, response)
    return None


def offer_rematch(game: Game, user) -> dict:
    """Propose une revanche (parité Lichess — n'ouvre pas encore la partie)."""
    if not _participant(game, user):
        return {"error": "Non participant"}
    if game.status != Game.Status.COMPLETED:
        return {"error": "Partie non terminée"}
    if game.is_vs_ai or not game.white_player_id or not game.black_player_id:
        return {"error": "Rematch impossible"}
    existing = Game.objects.filter(rematch_of=game).first()
    if existing:
        return {"ok": True, "game_id": str(existing.id), "status": "already_created"}
    game.rematch_offered_by = user
    game.save(update_fields=["rematch_offered_by"])
    try:
        from .ws_notify import notify_game_room

        notify_game_room(
            game.id,
            "rematch_offer",
            {"offered_by": user.id, "username": user.username},
        )
    except Exception:
        pass
    return {"ok": True, "status": "offered", "offered_by": user.id}


@transaction.atomic
def create_rematch(game: Game, user) -> Game | None:
    """
    Accepte / crée la revanche.
    - Si aucune offre : enregistre l'offre (1er clic).
    - Si offre adverse : crée UNE partie (couleurs inversées).
    - Si déjà créée : renvoie l'existante.
    """
    if not _participant(game, user):
        return None
    if game.status != Game.Status.COMPLETED:
        return None
    if game.is_vs_ai or not game.white_player_id or not game.black_player_id:
        return None

    game = Game.objects.select_for_update().get(pk=game.pk)
    existing = Game.objects.filter(rematch_of=game).first()
    if existing:
        return existing

    # Premier clic = offre ; second clic (adversaire) = création
    if not game.rematch_offered_by_id:
        game.rematch_offered_by = user
        game.save(update_fields=["rematch_offered_by"])
        try:
            from .ws_notify import notify_game_room

            notify_game_room(
                game.id,
                "rematch_offer",
                {"offered_by": user.id, "username": user.username},
            )
        except Exception:
            pass
        return None

    if game.rematch_offered_by_id == user.id:
        # Même joueur reclique — offre déjà posée
        return None

    timed, white_ms, black_ms, inc_ms, tcm = resolve_time_fields(
        game.is_timed,
        game.time_control_minutes,
    )
    from .draw_rules import init_repetition_counts

    fen, chess960_pos = starting_position_for_variant(game.variant)
    new_game = Game.objects.create(
        white_player=game.black_player,
        black_player=game.white_player,
        mode=game.mode,
        variant=game.variant,
        chess960_position_id=chess960_pos,
        status=Game.Status.ACTIVE,
        fen=fen,
        repetition_counts=init_repetition_counts(fen, game.variant),
        is_timed=timed,
        time_control_minutes=tcm,
        white_time_ms=white_ms,
        black_time_ms=black_ms,
        increment_ms=inc_ms,
        is_rated=game.is_rated,
        started_at=timezone.now(),
        turn_started_at=timezone.now() if timed else None,
        rematch_of=game,
    )
    game.rematch_offered_by = None
    game.save(update_fields=["rematch_offered_by"])
    ensure_game_room(new_game)
    from apps.notifications.services import create_match_found_notifications

    create_match_found_notifications(new_game.white_player_id, new_game.black_player_id, new_game)
    try:
        from .ws_notify import notify_game_room

        notify_game_room(
            game.id,
            "rematch_ready",
            {"game_id": str(new_game.id), "mode": new_game.mode},
        )
    except Exception:
        pass
    return new_game


def live_games_queryset():
    return Game.objects.filter(
        status=Game.Status.ACTIVE, is_vs_ai=False
    ).select_related("white_player", "black_player")
