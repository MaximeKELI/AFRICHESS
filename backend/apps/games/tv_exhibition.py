"""AFRICHESS TV — exhibitions IA vs IA (Stockfish force maximale + analyse live)."""

from __future__ import annotations

import logging
import math
from typing import Any, Optional

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .draw_rules import init_repetition_counts
from .engine import ChessEngineService
from .models import Game, GameAnalysis, Move
from .review_phases import infer_phase
from .variant_utils import board_from_fen

logger = logging.getLogger(__name__)

User = get_user_model()

TV_BOT_SPECS = (
    {"username": "tv_bot_sable", "first_name": "Sable", "last_name": "Master", "elo": 3200},
    {"username": "tv_bot_baobab", "first_name": "Baobab", "last_name": "Master", "elo": 3180},
    {"username": "tv_bot_kora", "first_name": "Kora", "last_name": "Master", "elo": 3190},
    {"username": "tv_bot_simba", "first_name": "Simba", "last_name": "Master", "elo": 3170},
    {"username": "tv_bot_nile", "first_name": "Nile", "last_name": "Master", "elo": 3210},
    {"username": "tv_bot_atlas", "first_name": "Atlas", "last_name": "Master", "elo": 3160},
    {"username": "tv_bot_sahara", "first_name": "Sahara", "last_name": "Master", "elo": 3220},
    {"username": "tv_bot_kilima", "first_name": "Kilima", "last_name": "Master", "elo": 3150},
    {"username": "tv_bot_akoma", "first_name": "Akoma", "last_name": "Master", "elo": 3230},
    {"username": "tv_bot_ubuntu", "first_name": "Ubuntu", "last_name": "Master", "elo": 3140},
)

# Au-delà du plafond UCI → profondeur/temps max (maîtres absolus)
EXHIBITION_TARGET_ELO = 4800
EXHIBITION_MOVE_TIME_HINT = 20
EXHIBITION_ANALYSIS_DEPTH = 14
MAX_ACTIVE_EXHIBITIONS = 5
# Filet de sécurité seulement (parties vraiment interminables) — pas une coupure « mid-game »
MAX_MOVES_BEFORE_RESTART = 400


def win_chance_from_eval(eval_pawns: float) -> tuple[float, float]:
    """Probabilités de gain Blancs / Noirs (formule type Lichess)."""
    cp = max(-1000.0, min(1000.0, float(eval_pawns) * 100.0))
    white = 100.0 / (1.0 + math.exp(-0.00368208 * cp))
    white = round(white, 1)
    return white, round(100.0 - white, 1)


def ensure_tv_bot_users() -> list:
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
        elif user.chess_level != "master":
            user.chess_level = "master"
            user.save(update_fields=["chess_level"])
        bots.append(user)
    return bots


def _pick_bot_pair(active: list[Game]) -> tuple:
    bots = ensure_tv_bot_users()
    used = set()
    for g in active:
        if g.white_player_id:
            used.add(g.white_player_id)
        if g.black_player_id:
            used.add(g.black_player_id)
    free = [b for b in bots if b.id not in used]
    if len(free) >= 2:
        return free[0], free[1]
    # Repli : paires cycliques
    n = Game.objects.filter(is_tv_exhibition=True).count()
    i = (n * 2) % len(bots)
    j = (n * 2 + 1) % len(bots)
    return bots[i], bots[j]


def create_exhibition_game(white=None, black=None) -> Game:
    if white is None or black is None:
        white, black = _pick_bot_pair([])

    start_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    game = Game.objects.create(
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
    GameAnalysis.objects.get_or_create(game=game)
    return game


def ensure_tv_exhibitions(count: int = MAX_ACTIVE_EXHIBITIONS) -> list[Game]:
    active = list(
        Game.objects.filter(status=Game.Status.ACTIVE, is_tv_exhibition=True).order_by(
            "started_at"
        )
    )
    while len(active) < count:
        white, black = _pick_bot_pair(active)
        # Alterner les couleurs pour la variété
        if len(active) % 2 == 1:
            white, black = black, white
        active.append(create_exhibition_game(white, black))
    return active


def rematch_exhibition(finished: Game) -> Game:
    """Relance immédiatement la même paire (couleurs inversées) pour une TV sans trou."""
    white = finished.black_player
    black = finished.white_player
    if white is None or black is None:
        return create_exhibition_game()
    return create_exhibition_game(white=white, black=black)


def _side_to_move_is_white(fen: str) -> bool:
    return " w " in fen or fen.endswith(" w")


def append_move_analysis(
    game: Game,
    *,
    fen_before: str,
    uci: str,
    san: str,
    played_by_white: bool,
    ply: int,
) -> dict[str, Any] | None:
    """Analyse le coup joué et l'ajoute à GameAnalysis (courbe + classification)."""
    engine = ChessEngineService()
    ev = engine.evaluate_played_move(
        fen_before,
        uci,
        played_by_white,
        ply=ply,
        depth=EXHIBITION_ANALYSIS_DEPTH,
    )
    if not ev:
        # Repli minimal sans moteur
        row = {
            "uci": uci,
            "san": san,
            "eval": 0.0,
            "eval_before": 0.0,
            "class": "best",
            "cp_loss": 0,
            "played_by_white": played_by_white,
            "best_uci": uci,
            "best_san": san,
            "pv_san": san,
            "phase": infer_phase(ply),
            "win_chance_white": 50.0,
            "win_chance_black": 50.0,
        }
    else:
        wc_w, wc_b = win_chance_from_eval(ev.eval_after)
        row = {
            "uci": ev.uci,
            "san": ev.san,
            "eval": ev.eval_after,
            "eval_before": ev.eval_before,
            "class": ev.classification,
            "cp_loss": ev.centipawn_loss,
            "played_by_white": played_by_white,
            "best_uci": ev.best_uci,
            "best_san": ev.best_san,
            "pv_san": ev.pv_san,
            "phase": infer_phase(ply),
            "win_chance_white": wc_w,
            "win_chance_black": wc_b,
        }

    analysis, _ = GameAnalysis.objects.get_or_create(game=game)
    moves = list(analysis.best_moves_json or [])
    moves.append(row)
    analysis.best_moves_json = moves
    analysis.save(update_fields=["best_moves_json", "evaluated_at"])
    return row


def tv_analysis_payload(game: Game) -> dict[str, Any] | None:
    """Payload analyse live pour le serializer TV."""
    if not game.is_tv_exhibition:
        return None
    try:
        analysis = game.analysis
    except GameAnalysis.DoesNotExist:
        return {
            "eval": 0.0,
            "win_chance_white": 50.0,
            "win_chance_black": 50.0,
            "curve": [],
            "last_move": None,
            "moves": [],
        }
    moves = list(analysis.best_moves_json or [])
    if not moves:
        return {
            "eval": 0.0,
            "win_chance_white": 50.0,
            "win_chance_black": 50.0,
            "curve": [],
            "last_move": None,
            "moves": [],
        }
    last = moves[-1]
    eval_after = float(last.get("eval") or 0.0)
    wc_w = last.get("win_chance_white")
    wc_b = last.get("win_chance_black")
    if wc_w is None or wc_b is None:
        wc_w, wc_b = win_chance_from_eval(eval_after)
    uci = last.get("uci") or ""
    return {
        "eval": eval_after,
        "win_chance_white": wc_w,
        "win_chance_black": wc_b,
        "curve": [
            {
                "eval": m.get("eval"),
                "eval_before": m.get("eval_before"),
                "class": m.get("class"),
                "san": m.get("san"),
            }
            for m in moves
        ],
        "last_move": {
            "san": last.get("san"),
            "class": last.get("class"),
            "uci": uci,
            "from": uci[:2] if len(uci) >= 4 else "",
            "to": uci[2:4] if len(uci) >= 4 else "",
            "played_by_white": last.get("played_by_white"),
            "cp_loss": last.get("cp_loss"),
        },
        "moves": moves[-40:],
    }


def play_exhibition_move(game: Game) -> Optional[dict]:
    """Joue un coup Stockfish max pour le camp au trait. Retourne un résumé ou None."""
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
        rematch = rematch_exhibition(game)
        return {
            "completed": True,
            "reason": "length",
            "game_id": str(game.id),
            "rematch_id": str(rematch.id),
        }

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
    ply = game.move_count

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
            # Uniquement les nulles automatiques FIDE — pas les « claims »
            # (threefold / 50 coups) qui coupaient les exhibitions trop tôt
            or board.is_seventyfive_moves()
            or board.is_fivefold_repetition()
        ):
            game.status = Game.Status.DRAW
            game.result = Game.Result.DRAW
            if board.is_stalemate():
                game.termination_reason = "stalemate"
            elif board.is_insufficient_material():
                game.termination_reason = "insufficient"
            elif board.is_seventyfive_moves():
                game.termination_reason = "seventyfive"
            else:
                game.termination_reason = "fivefold"
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

    analysis_row = None
    try:
        analysis_row = append_move_analysis(
            game,
            fen_before=fen_before,
            uci=best.uci,
            san=san,
            played_by_white=played_by_white,
            ply=ply,
        )
    except Exception:
        logger.exception("TV exhibition analysis failed for %s", game.id)

    try:
        from .ws_notify import notify_game_room
        from .realtime_services import build_ws_payload

        extra = {"tv_exhibition": True}
        if analysis_row:
            extra["tv_analysis"] = {
                "eval": analysis_row.get("eval"),
                "class": analysis_row.get("class"),
                "san": analysis_row.get("san"),
                "win_chance_white": analysis_row.get("win_chance_white"),
                "win_chance_black": analysis_row.get("win_chance_black"),
            }
        notify_game_room(str(game.id), "broadcast_move", build_ws_payload(game, extra))
    except Exception:
        logger.debug("TV exhibition WS notify skipped", exc_info=True)

    completed = game.status != Game.Status.ACTIVE
    rematch_id = None
    if completed:
        rematch = rematch_exhibition(game)
        rematch_id = str(rematch.id)

    return {
        "game_id": str(game.id),
        "uci": best.uci,
        "san": san,
        "class": (analysis_row or {}).get("class"),
        "completed": completed,
        "rematch_id": rematch_id,
    }


def tick_tv_exhibitions() -> dict:
    """Assure 5 exhibitions actives en permanence et joue un coup sur chacune."""
    games = ensure_tv_exhibitions()
    results = []
    for g in games:
        try:
            g.refresh_from_db()
            if g.status != Game.Status.ACTIVE:
                continue
            r = play_exhibition_move(g)
            if r:
                results.append(r)
        except Exception:
            logger.exception("TV exhibition tick failed for %s", g.id)
    # Toujours reboucher les trous (victoire / nulle / crash / course)
    active = ensure_tv_exhibitions()
    return {
        "played": len(results),
        "active": len(active),
        "results": results,
    }
