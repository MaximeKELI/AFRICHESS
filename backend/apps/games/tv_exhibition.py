"""AFRICHESS TV — exhibitions IA vs IA (vraies parties Stockfish)."""

from __future__ import annotations

import logging
from typing import Optional

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .draw_rules import init_repetition_counts
from .engine import ChessEngineService
from .models import Game, Move
from .variant_utils import board_from_fen

logger = logging.getLogger(__name__)

User = get_user_model()

TV_BOT_SPECS = (
    {
        "username": "tv_bot_sable",
        "first_name": "Sable",
        "last_name": "Engine",
        "elo": 2400,
    },
    {
        "username": "tv_bot_baobab",
        "first_name": "Baobab",
        "last_name": "Engine",
        "elo": 2350,
    },
)

EXHIBITION_TARGET_ELO = 2300
EXHIBITION_MOVE_TIME_HINT = 12  # difficulté affichage
MAX_ACTIVE_EXHIBITIONS = 1
MAX_MOVES_BEFORE_RESTART = 120  # éviter les parties infinies


def ensure_tv_bot_users() -> tuple:
    bots = []
    for spec in TV_BOT_SPECS:
        user, created = User.objects.get_or_create(
            username=spec["username"],
            defaults={
                "email": f"{spec['username']}@africhess.tv",
                "first_name": spec["first_name"],
                "last_name": spec["last_name"],
                "chess_level": "master",
            },
        )
        if created:
            user.set_unusable_password()
            user.save()
        bots.append(user)
    return bots[0], bots[1]


def create_exhibition_game(white=None, black=None) -> Game:
    white, black = white or ensure_tv_bot_users()[0], black or ensure_tv_bot_users()[1]
    # Alterner les couleurs selon le nombre d'exhibitions passées
    if Game.objects.filter(is_tv_exhibition=True).count() % 2 == 1:
        white, black = black, white

    start_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    return Game.objects.create(
        white_player=white,
        black_player=black,
        mode=Game.Mode.BLITZ,
        status=Game.Status.ACTIVE,
        fen=start_fen,
        repetition_counts=init_repetition_counts(start_fen, Game.Variant.STANDARD),
        is_vs_ai=False,
        is_tv_exhibition=True,
        is_rated=False,
        is_timed=False,
        ai_target_elo=EXHIBITION_TARGET_ELO,
        ai_difficulty=EXHIBITION_MOVE_TIME_HINT,
        started_at=timezone.now(),
        turn_started_at=timezone.now(),
    )


def ensure_tv_exhibitions(count: int = MAX_ACTIVE_EXHIBITIONS) -> list[Game]:
    active = list(
        Game.objects.filter(status=Game.Status.ACTIVE, is_tv_exhibition=True).order_by(
            "started_at"
        )
    )
    while len(active) < count:
        active.append(create_exhibition_game())
    return active


def _side_to_move_is_white(fen: str) -> bool:
    return " w " in fen or fen.endswith(" w")


def play_exhibition_move(game: Game) -> Optional[dict]:
    """Joue un coup Stockfish pour le camp au trait. Retourne un résumé ou None."""
    if game.status != Game.Status.ACTIVE or not game.is_tv_exhibition:
        return None

    if game.move_count >= MAX_MOVES_BEFORE_RESTART:
        game.status = Game.Status.DRAW
        game.result = Game.Result.DRAW
        game.termination_reason = "exhibition_length"
        game.ended_at = timezone.now()
        game.save(
            update_fields=["status", "result", "termination_reason", "ended_at"]
        )
        return {"completed": True, "reason": "length"}

    engine = ChessEngineService()
    best = engine.get_best_move(
        game.fen,
        EXHIBITION_MOVE_TIME_HINT,
        target_elo=EXHIBITION_TARGET_ELO,
        variant=game.variant,
    )
    if not best:
        logger.warning("TV exhibition: pas de coup pour %s", game.id)
        return None

    fen_before = game.fen
    applied = engine.apply_move(fen_before, best.uci, variant=game.variant)
    if not applied:
        return None
    new_fen, san, _ = applied
    played_by_white = _side_to_move_is_white(fen_before)
    move_number = game.move_count // 2 + 1

    with transaction.atomic():
        game = Game.objects.select_for_update().get(pk=game.pk)
        if game.status != Game.Status.ACTIVE:
            return None
        game.fen = new_fen
        game.move_count += 1
        if played_by_white:
            game.pgn = (game.pgn + f" {move_number}. {san}").strip()
        else:
            game.pgn = (game.pgn + f" {san}").strip()
        game.turn_started_at = timezone.now()

        board = board_from_fen(new_fen, game.variant)
        if board.is_checkmate():
            game.status = Game.Status.COMPLETED
            game.result = (
                Game.Result.WHITE_WIN if played_by_white else Game.Result.BLACK_WIN
            )
            game.winner = game.white_player if played_by_white else game.black_player
            game.termination_reason = "checkmate"
            game.ended_at = timezone.now()
        elif (
            board.is_stalemate()
            or board.is_insufficient_material()
            or board.is_seventyfive_moves()
            or board.is_fivefold_repetition()
        ):
            game.status = Game.Status.DRAW
            game.result = Game.Result.DRAW
            game.termination_reason = "draw"
            game.ended_at = timezone.now()

        game.save()
        Move.objects.create(
            game=game,
            uci=best.uci,
            san=san,
            fen_after=new_fen,
            from_square=best.uci[:2],
            to_square=best.uci[2:4],
            played_by_white=played_by_white,
            move_number=move_number,
        )

    try:
        from .ws_notify import notify_game_room
        from .realtime_services import build_ws_payload

        notify_game_room(str(game.id), "broadcast_move", build_ws_payload(game, {"tv_exhibition": True}))
    except Exception:
        logger.debug("TV exhibition WS notify skipped", exc_info=True)

    return {
        "game_id": str(game.id),
        "uci": best.uci,
        "san": san,
        "completed": game.status != Game.Status.ACTIVE,
    }


def tick_tv_exhibitions() -> dict:
    """Assure 1 exhibition active et joue un coup sur chacune."""
    games = ensure_tv_exhibitions()
    results = []
    for g in games:
        try:
            r = play_exhibition_move(g)
            if r:
                results.append(r)
                if r.get("completed"):
                    ensure_tv_exhibitions()
        except Exception:
            logger.exception("TV exhibition tick failed for %s", g.id)
    return {"played": len(results), "results": results}
