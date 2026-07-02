"""Notifications WebSocket depuis les vues HTTP (nulle, reprise, etc.)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def notify_game_room(game_id, handler: str, payload: dict) -> None:
    """Envoie un événement au groupe Channels de la partie (`game_<uuid>`)."""
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            f"game_{game_id}",
            {"type": handler, "payload": payload},
        )
    except Exception as exc:
        logger.warning("WS notify game=%s handler=%s failed: %s", game_id, handler, exc)


def notify_move_made(game, result: dict) -> None:
    """Broadcast coup joué via HTTP aux clients WebSocket de la partie."""
    from .models import Game
    from .realtime_services import build_ws_move_payload

    last_move = None
    player_move = result.get("move")
    ai_move = result.get("ai_move_record")
    m = ai_move or player_move
    if m is None:
        m = game.moves.order_by("-move_number").first()
    if m:
        last_move = {
            "san": m.san,
            "uci": m.uci,
            "from_square": m.from_square,
            "to_square": m.to_square,
            "played_by_white": m.played_by_white,
        }
    payload = build_ws_move_payload(
        game,
        result,
        {
            "last_move": last_move,
            "game_over": bool(result.get("game_over"))
            or game.status == Game.Status.COMPLETED,
        },
    )
    notify_game_room(game.id, "broadcast_move", payload)
    notify_simul_from_game(game)
    if game.status == Game.Status.COMPLETED:
        maybe_complete_simul_session(game)


def notify_simul_room(session_id: int, handler: str, payload: dict) -> None:
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            f"simul_{session_id}",
            {"type": handler, "payload": payload},
        )
    except Exception as exc:
        logger.warning("WS notify simul=%s handler=%s failed: %s", session_id, handler, exc)


def notify_simul_from_game(game) -> None:
    try:
        board = game.simul_board
    except Exception:
        return
    session = board.session
    notify_simul_room(
        session.id,
        "broadcast_board_updated",
        {
            "session_id": session.id,
            "board_number": board.board_number,
            "game_id": str(game.id),
            "opponent": board.opponent.username,
            "status": game.status,
            "result": game.result or "",
            "fen": game.fen,
            "move_count": game.move_count,
        },
    )


def maybe_complete_simul_session(game) -> None:
    from .models import Game, SimulBoard

    try:
        board = game.simul_board
    except SimulBoard.DoesNotExist:
        return
    session = board.session
    games = [b.game for b in session.boards.select_related("game")]
    if not games or not all(g.status == Game.Status.COMPLETED for g in games):
        return
    if session.status == session.Status.COMPLETED:
        return
    session.status = session.Status.COMPLETED
    session.save(update_fields=["status"])
    notify_simul_room(
        session.id,
        "broadcast_session_status",
        {"session_id": session.id, "status": session.status, "boards_count": len(games)},
    )


def notify_vote_updated(game, user=None) -> None:
    from .extra_views import _vote_tally

    if not getattr(game, "is_vote_chess", False):
        return
    payload = _vote_tally(game, user)
    notify_game_room(game.id, "broadcast_vote", payload)


def notify_analysis_ready(game) -> None:
    """Informe les clients WS que l'analyse post-partie est prête."""
    try:
        from .models import GameAnalysis
        from .serializers import GameAnalysisSerializer

        analysis = GameAnalysis.objects.filter(game=game).first()
        if not analysis or not analysis.best_moves_json:
            return
        payload = {
            "game_id": str(game.id),
            "analysis": GameAnalysisSerializer(analysis).data,
        }
        notify_game_room(game.id, "analysis_ready", payload)
    except Exception as exc:
        logger.warning("notify_analysis_ready failed for game %s: %s", game.id, exc)
