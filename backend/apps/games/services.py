"""Game business logic: creation, moves, matchmaking."""
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.ratings.services import RatingService

from .anticheat import validate_move_timing
from .draw_rules import can_claim_threefold_from_game, finalize_repetition_draw
from .time_control import resolve_time_fields
from .clock_service import (
    apply_increment_after_move,
    apply_server_clock_before_move,
    check_timeout,
    tick_turn_started,
)
from .commentary import generate_move_comment
from .elo_adapt import resolve_final_ai_elo
from .elo_config import elo_to_difficulty_label
from .stats_service import on_game_completed
from .engine import ChessEngineService
from .models import Game, MatchmakingQueue, Move
from .room_utils import ensure_game_room, uci_to_squares

MODE_TIME_CONFIG = {
    "bullet": {"initial_ms": 60000, "increment_ms": 0},
    "blitz": {"initial_ms": 180000, "increment_ms": 2000},
    "rapid": {"initial_ms": 600000, "increment_ms": 0},
    "classical": {"initial_ms": 1800000, "increment_ms": 0},
}


class GameService:
    def __init__(self):
        self.engine = ChessEngineService()
        self.rating_service = RatingService()

    def create_ai_game(
        self,
        user,
        mode="blitz",
        difficulty=None,
        color="white",
        include_comments=False,
        ai_elo=None,
        is_timed=True,
        time_minutes=None,
    ):
        timed, white_ms, black_ms, inc_ms, tcm = resolve_time_fields(
            is_timed, time_minutes
        )
        target_elo = resolve_final_ai_elo(
            user, mode=mode, difficulty=difficulty, ai_elo=ai_elo
        )
        display_difficulty = elo_to_difficulty_label(target_elo)

        game = Game.objects.create(
            white_player=user if color == "white" else None,
            black_player=None if color == "white" else user,
            mode=Game.Mode.AI,
            status=Game.Status.ACTIVE,
            is_vs_ai=True,
            ai_difficulty=display_difficulty,
            ai_target_elo=target_elo,
            is_timed=timed,
            time_control_minutes=tcm,
            white_time_ms=white_ms,
            black_time_ms=black_ms,
            increment_ms=inc_ms,
            started_at=timezone.now(),
            turn_started_at=timezone.now() if timed else None,
        )
        if color == "black":
            ai_move = self.engine.get_best_move(
                game.fen, display_difficulty, target_elo=target_elo
            )
            if ai_move:
                fen_before = game.fen
                ai_result = self.engine.apply_move(fen_before, ai_move.uci)
                if ai_result:
                    nf, ai_san, _ = ai_result
                    comment = ""
                    if include_comments:
                        eval_after = self.engine.analyze_position(nf, depth=10)
                        comment = generate_move_comment(
                            fen_before,
                            ai_move.uci,
                            ai_san,
                            played_by_ai=True,
                            mover_is_white=True,
                            move_number=1,
                            eval_after=eval_after,
                        )
                    game.fen = nf
                    game.move_count += 1
                    game.pgn = f"1. {ai_san}"
                    game.save()
                    self._record_move(
                        game,
                        ai_move.uci,
                        ai_san,
                        played_by_white=True,
                        comment=comment,
                    )
        return game

    def create_friend_game(
        self,
        white,
        black,
        mode="blitz",
        is_timed=True,
        time_minutes=None,
    ):
        timed, white_ms, black_ms, inc_ms, tcm = resolve_time_fields(
            is_timed, time_minutes
        )
        game = Game.objects.create(
            white_player=white,
            black_player=black,
            mode=mode,
            status=Game.Status.ACTIVE,
            is_timed=timed,
            time_control_minutes=tcm,
            white_time_ms=white_ms,
            black_time_ms=black_ms,
            increment_ms=inc_ms,
            started_at=timezone.now(),
            turn_started_at=timezone.now() if timed else None,
        )
        ensure_game_room(game)
        return game

    def _apply_clock(self, game: Game, mover_is_white: bool, spent_ms: int) -> None:
        spent = max(0, int(spent_ms))
        if mover_is_white:
            game.white_time_ms = max(0, game.white_time_ms - spent) + game.increment_ms
        else:
            game.black_time_ms = max(0, game.black_time_ms - spent) + game.increment_ms

    def _ai_clock_tick(self, game: Game, ai_is_white: bool, ms: int = 400) -> None:
        if ai_is_white:
            game.white_time_ms = max(0, game.white_time_ms - ms) + game.increment_ms
        else:
            game.black_time_ms = max(0, game.black_time_ms - ms) + game.increment_ms

    @transaction.atomic
    def undo_moves(self, game: Game, user) -> dict:
        if not game.is_vs_ai or game.status != Game.Status.ACTIVE:
            return {"error": "Undo only for active AI games"}
        user_is_white = game.white_player_id == user.id
        last = game.moves.order_by("-move_number").first()
        if not last:
            return {"error": "No moves to undo"}

        n = 2 if last.played_by_white != user_is_white else 1
        to_remove = list(game.moves.order_by("-move_number")[:n])
        for m in to_remove:
            m.delete()

        import chess

        board = chess.Board()
        for m in game.moves.order_by("move_number"):
            board.push_uci(m.uci)
        game.fen = board.fen()
        game.move_count = game.moves.count()
        game.save(update_fields=["fen", "move_count"])
        return {"ok": True, "undone": n}

    @transaction.atomic
    def make_move(
        self,
        game: Game,
        user,
        uci: str,
        include_comments: bool = False,
        spent_ms: int | None = None,
    ) -> dict:
        if game.status != Game.Status.ACTIVE:
            return {"error": "Game is not active"}

        cheat = validate_move_timing(game, user)
        if cheat:
            return cheat

        is_white_turn = " w " in game.fen
        if is_white_turn and game.white_player != user:
            return {"error": "Not your turn"}
        if not is_white_turn and game.black_player != user and not game.is_vs_ai:
            return {"error": "Not your turn"}

        is_correspondence = game.mode == Game.Mode.CORRESPONDENCE

        if not is_correspondence and game.is_timed and not game.is_vs_ai:
            apply_server_clock_before_move(game)
            timed_out = check_timeout(game)
            if timed_out == "white":
                self._finalize_game_on_timeout(game, winner_white=False)
                game.save()
                on_game_completed(game)
                return {"error": "Time out", "game_over": True}
            if timed_out == "black":
                self._finalize_game_on_timeout(game, winner_white=True)
                game.save()
                on_game_completed(game)
                return {"error": "Time out", "game_over": True}
        elif not is_correspondence and game.is_timed and spent_ms is not None:
            clock = game.white_time_ms if is_white_turn else game.black_time_ms
            if clock <= 0:
                return {"error": "Time out"}
            if spent_ms > clock:
                spent_ms = clock
            self._apply_clock(game, is_white_turn, spent_ms)
            if (is_white_turn and game.white_time_ms <= 0) or (
                not is_white_turn and game.black_time_ms <= 0
            ):
                self._finalize_game_on_timeout(game, winner_white=not is_white_turn)
                game.save()
                return {"error": "Time out", "game_over": True}

        result = self.engine.apply_move(game.fen, uci)
        if not result:
            return {"error": "Illegal move"}

        new_fen, san, is_over = result
        fen_before_player = game.fen
        player_comment = ""
        if include_comments and game.is_vs_ai:
            eval_before = self.engine.analyze_position(fen_before_player, depth=10)
            eval_after = self.engine.analyze_position(new_fen, depth=10)
            player_comment = generate_move_comment(
                fen_before_player,
                uci,
                san,
                played_by_ai=False,
                mover_is_white=is_white_turn,
                move_number=game.move_count + 1,
                eval_before=eval_before,
                eval_after=eval_after,
            )
        game.fen = new_fen
        move = self._record_move(
            game,
            uci,
            san,
            played_by_white=is_white_turn,
            time_ms=game.white_time_ms if is_white_turn else game.black_time_ms,
            comment=player_comment,
            fen_after=new_fen,
        )
        game.move_count += 1
        game.pgn = (game.pgn or "") + f" {game.move_count}. {san}" if is_white_turn else f" {san}"
        if not game.is_vs_ai:
            apply_increment_after_move(game, is_white_turn)
            tick_turn_started(game)
        game.save()

        if can_claim_threefold_from_game(game):
            finalize_repetition_draw(game)
            game.save()
            on_game_completed(game)
            return {
                "move": move,
                "fen": game.fen,
                "game_over": True,
                "result": game.result,
                "termination_reason": "repetition",
                "draw_claim": "threefold",
            }

        response = {"move": move, "fen": new_fen, "game_over": is_over}

        if game.is_vs_ai and not is_over:
            ai_move = self.engine.get_best_move(
                new_fen,
                game.ai_difficulty,
                target_elo=game.ai_target_elo,
            )
            if ai_move:
                ai_result = self.engine.apply_move(new_fen, ai_move.uci)
                if ai_result:
                    nf, ai_san, ai_over = ai_result
                    ai_comment = ""
                    if include_comments:
                        eval_before = self.engine.analyze_position(new_fen, depth=10)
                        eval_after = self.engine.analyze_position(nf, depth=10)
                        ai_comment = generate_move_comment(
                            new_fen,
                            ai_move.uci,
                            ai_san,
                            played_by_ai=True,
                            mover_is_white=not is_white_turn,
                            move_number=game.move_count + 1,
                            eval_before=eval_before,
                            eval_after=eval_after,
                        )
                    self._record_move(
                        game,
                        ai_move.uci,
                        ai_san,
                        played_by_white=not is_white_turn,
                        comment=ai_comment,
                    )
                    self._ai_clock_tick(game, ai_is_white=not is_white_turn)
                    game.fen = nf
                    game.move_count += 1
                    game.save()
                    response["ai_move"] = {"uci": ai_move.uci, "san": ai_san}
                    response["fen"] = nf
                    response["game_over"] = ai_over
                    is_over = ai_over

                    if can_claim_threefold_from_game(game):
                        finalize_repetition_draw(game)
                        game.save()
                        on_game_completed(game)
                        response["game_over"] = True
                        response["result"] = game.result
                        response["termination_reason"] = "repetition"
                        response["draw_claim"] = "threefold"
                        is_over = True

        if is_over:
            self._finalize_game(game)
            on_game_completed(game)

        return response

    def _record_move(
        self,
        game,
        uci,
        san,
        played_by_white,
        time_ms=None,
        comment="",
        fen_after=None,
    ):
        from_sq, to_sq = uci_to_squares(uci)
        return Move.objects.create(
            game=game,
            move_number=game.move_count + 1,
            san=san,
            uci=uci,
            from_square=from_sq,
            to_square=to_sq,
            fen_after=fen_after or game.fen,
            played_by_white=played_by_white,
            time_remaining_ms=time_ms,
            comment=comment or "",
        )

    def _finalize_game_on_timeout(self, game: Game, winner_white: bool) -> None:
        game.result = (
            Game.Result.WHITE_WIN if winner_white else Game.Result.BLACK_WIN
        )
        if game.is_vs_ai:
            game.winner = game.white_player if winner_white else None
            if not winner_white:
                game.winner = game.black_player
        else:
            game.winner = game.white_player if winner_white else game.black_player
        game.status = Game.Status.COMPLETED
        game.ended_at = timezone.now()
        game.termination_reason = "timeout"

    def _finalize_game(self, game: Game):
        import chess
        board = chess.Board(game.fen)
        if board.is_checkmate():
            winner_color = "black" if board.turn == chess.WHITE else "white"
            game.result = Game.Result.WHITE_WIN if winner_color == "white" else Game.Result.BLACK_WIN
            game.winner = game.white_player if winner_color == "white" else game.black_player
        elif board.is_stalemate() or board.is_insufficient_material() or board.can_claim_draw():
            game.result = Game.Result.DRAW
        game.status = Game.Status.COMPLETED
        game.ended_at = timezone.now()
        game.save()
        if not game.is_vs_ai and game.white_player and game.black_player:
            self.rating_service.update_ratings(game)
        if game.tournament_id:
            try:
                from apps.tournaments.services import TournamentEngine

                TournamentEngine().record_result(game)
            except Exception as exc:
                logger.warning(
                    "Tournament result not recorded for game %s: %s", game.id, exc
                )


class MatchmakingService:
    ELO_RANGE = settings.MATCHMAKING_ELO_RANGE

    def join_queue(
        self,
        user,
        mode: str,
        elo: int,
        is_timed: bool = True,
        time_minutes: int | None = None,
    ):
        _, _, _, _, tcm = resolve_time_fields(is_timed, time_minutes)
        MatchmakingQueue.objects.update_or_create(
            user=user,
            defaults={
                "mode": mode,
                "elo": elo,
                "is_timed": is_timed,
                "time_control_minutes": tcm,
            },
        )

    def leave_queue(self, user):
        MatchmakingQueue.objects.filter(user=user).delete()

    def find_match(
        self,
        user,
        mode: str,
        elo: int,
        is_timed: bool = True,
        time_minutes: int | None = None,
    ):
        _, _, _, _, tcm = resolve_time_fields(is_timed, time_minutes)
        candidates = MatchmakingQueue.objects.filter(
            mode=mode,
            is_timed=is_timed,
            time_control_minutes=tcm,
            elo__gte=elo - self.ELO_RANGE,
            elo__lte=elo + self.ELO_RANGE,
        ).exclude(user=user).order_by("joined_at")

        for candidate in candidates[:5]:
            opponent = candidate.user
            self.leave_queue(user)
            self.leave_queue(opponent)
            return GameService().create_friend_game(
                white=user,
                black=opponent,
                mode=mode,
                is_timed=is_timed,
                time_minutes=time_minutes,
            )
        return None

    def cleanup_stale(self, minutes=10):
        cutoff = timezone.now() - timedelta(minutes=minutes)
        MatchmakingQueue.objects.filter(joined_at__lt=cutoff).delete()

    def pair_all_waiting(self):
        """Apparie automatiquement les joueurs en file par mode et ELO."""
        self.cleanup_stale()
        modes = (
            MatchmakingQueue.objects.values_list("mode", flat=True).distinct()
        )
        for mode in modes:
            entries = list(
                MatchmakingQueue.objects.filter(mode=mode).order_by("joined_at")
            )
            used = set()
            for i, a in enumerate(entries):
                if a.user_id in used:
                    continue
                best = None
                best_diff = self.ELO_RANGE + 1
                for j, b in enumerate(entries):
                    if j <= i or b.user_id in used or b.user_id == a.user_id:
                        continue
                    if a.is_timed != b.is_timed:
                        continue
                    if a.time_control_minutes != b.time_control_minutes:
                        continue
                    diff = abs(a.elo - b.elo)
                    if diff <= self.ELO_RANGE and diff < best_diff:
                        best = b
                        best_diff = diff
                if best:
                    used.add(a.user_id)
                    used.add(best.user_id)
                    self.leave_queue(a.user)
                    self.leave_queue(best.user)
                    game = GameService().create_friend_game(
                        white=a.user,
                        black=best.user,
                        mode=mode,
                        is_timed=a.is_timed,
                        time_minutes=a.time_control_minutes,
                    )
                    self._notify_match(a.user_id, best.user_id, game)

    def _notify_match(self, user_a_id, user_b_id, game):
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            layer = get_channel_layer()
            payload = {
                "type": "match_found",
                "game_id": str(game.id),
                "room_id": str(game.id),
                "mode": game.mode,
            }
            for uid in (user_a_id, user_b_id):
                async_to_sync(layer.group_send)(f"user_{uid}", payload)
        except Exception as exc:
            logger.warning("Matchmaking WS notify failed: %s", exc)
