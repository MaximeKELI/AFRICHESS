"""Actions de partie : nulle, rematch, takeback, abort, liste live."""

from django.utils import timezone

from .models import Game
from .room_utils import ensure_game_room
from .services import GameService
from .time_control import resolve_time_fields
from .variant_utils import board_from_fen

ABORT_WINDOW_SECONDS = 60


def _participant(game: Game, user) -> bool:
    return user.id in (game.white_player_id, game.black_player_id)


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
    game.draw_offered_by = None
    game.takeback_requested_by = None
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
    board = board_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", game.variant)
    for m in game.moves.order_by("move_number"):
        board.push_uci(m.uci)
    game.fen = board.fen()
    game.move_count = game.moves.count()
    game.takeback_requested_by = None
    game.draw_offered_by = None
    from .draw_rules import rebuild_repetition_counts

    game.repetition_counts = rebuild_repetition_counts(game)
    game.save(
        update_fields=[
            "fen",
            "move_count",
            "takeback_requested_by",
            "draw_offered_by",
            "repetition_counts",
        ]
    )
    return {"ok": True, "undone": 1}


def decline_takeback(game: Game, user) -> dict:
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
    if not game.draw_offered_by_id or game.draw_offered_by_id == user.id:
        return {"error": "Aucune proposition adverse"}
    if not _participant(game, user):
        return {"error": "Non participant"}
    game.result = Game.Result.DRAW
    game.status = Game.Status.COMPLETED
    game.ended_at = timezone.now()
    game.termination_reason = "draw_agreement"
    game.draw_offered_by = None
    game.save()
    GameService()._after_human_game_finished(game)
    return {"ok": True, "result": "1/2-1/2"}


def decline_draw(game: Game, user) -> dict:
    game.draw_offered_by = None
    game.save(update_fields=["draw_offered_by"])
    return {"ok": True}


def resign_game(game: Game, user) -> dict:
    if game.status != Game.Status.ACTIVE:
        return {"error": "Partie terminée"}
    if not _participant(game, user):
        return {"error": "Non participant"}
    if game.is_vs_ai:
        return {"error": "Abandon IA via l'API de coup"}

    if game.white_player_id == user.id:
        game.result = Game.Result.BLACK_WIN
        game.winner = game.black_player
    else:
        game.result = Game.Result.WHITE_WIN
        game.winner = game.white_player
    game.status = Game.Status.COMPLETED
    game.ended_at = timezone.now()
    game.termination_reason = "resignation"
    game.draw_offered_by = None
    game.takeback_requested_by = None
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


def create_rematch(game: Game, user) -> Game | None:
    if not _participant(game, user):
        return None
    timed, white_ms, black_ms, inc_ms, tcm = resolve_time_fields(
        game.is_timed,
        game.time_control_minutes,
    )
    new_game = Game.objects.create(
        white_player=game.black_player,
        black_player=game.white_player,
        mode=game.mode,
        variant=game.variant,
        status=Game.Status.ACTIVE,
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
    ensure_game_room(new_game)
    return new_game


def live_games_queryset():
    return Game.objects.filter(
        status=Game.Status.ACTIVE, is_vs_ai=False
    ).select_related("white_player", "black_player")[:30]
