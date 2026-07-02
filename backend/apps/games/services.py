"""Game business logic: creation, moves, matchmaking."""
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)


def _comment_spec(
    move,
    fen_before: str,
    fen_after: str,
    *,
    played_by_ai: bool,
    mover_is_white: bool,
) -> dict:
    return {
        "move_id": move.pk,
        "fen_before": fen_before,
        "fen_after": fen_after,
        "uci": move.uci,
        "san": move.san,
        "played_by_ai": played_by_ai,
        "mover_is_white": mover_is_white,
        "move_number": move.move_number,
    }


from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from apps.ratings.services import RatingService

from .anticheat import validate_move_fairplay
from .draw_rules import can_claim_threefold_from_game, finalize_repetition_draw
from .time_control import normalize_matchmaking_time_control, resolve_time_fields
from .clock_service import (
    apply_increment_after_move,
    apply_server_clock_before_move,
    check_timeout,
    tick_turn_started,
)
from .commentary_async import schedule_move_comments
from .elo_adapt import resolve_final_ai_elo
from .elo_config import elo_to_difficulty_label
from .stats_service import on_game_completed
from .engine import ChessEngineService
from .models import ChessBot, CorrespondenceQueue, Game, MatchmakingQueue, Move
from .variant_utils import generate_chess960_start, starting_position_for_variant
from .room_utils import ensure_game_room, uci_to_squares

def create_matchmaking_game(
    white,
    black,
    mode: str,
    *,
    is_timed: bool = True,
    time_minutes: int | None = None,
    time_control: str | None = None,
    is_rated: bool = True,
    variant: str = "standard",
) -> Game:
    """Crée une partie en ligne avec la cadence choisie."""
    tc = normalize_matchmaking_time_control(
        mode,
        is_timed=is_timed,
        is_rated=is_rated,
        time_minutes=time_minutes,
        time_control=time_control,
    )
    return GameService().create_friend_game(
        white=white,
        black=black,
        mode=mode,
        is_timed=is_timed,
        time_minutes=time_minutes,
        time_control=tc if is_timed else None,
        is_rated=is_rated,
        variant=variant,
    )


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
        time_control=None,
        bot=None,
        variant=Game.Variant.STANDARD,
    ):
        timed, white_ms, black_ms, inc_ms, tcm = resolve_time_fields(
            is_timed, time_minutes, time_control=time_control
        )
        if bot:
            target_elo = bot.elo
        else:
            target_elo = resolve_final_ai_elo(
                user, mode=mode, difficulty=difficulty, ai_elo=ai_elo
            )
        display_difficulty = elo_to_difficulty_label(target_elo)

        start_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        chess960_pos = None
        if variant == Game.Variant.CHESS960:
            start_fen, chess960_pos = generate_chess960_start()
        elif variant == Game.Variant.CRAZYHOUSE:
            import chess.variant

            start_fen = chess.variant.CrazyhouseBoard().fen()
        elif variant == Game.Variant.KING_OF_THE_HILL:
            import chess.variant

            start_fen = chess.variant.KingOfTheHillBoard().fen()
        elif variant == Game.Variant.THREE_CHECK:
            import chess.variant

            start_fen = chess.variant.ThreeCheckBoard().fen()

        game = Game.objects.create(
            white_player=user if color == "white" else None,
            black_player=None if color == "white" else user,
            mode=Game.Mode.AI,
            variant=variant,
            chess960_position_id=chess960_pos,
            bot=bot,
            fen=start_fen,
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
        if bot:
            ChessBot.objects.filter(pk=bot.pk).update(
                games_played=models.F("games_played") + 1
            )
        if color == "black":
            ai_move = self.engine.get_best_move(
                game.fen,
                display_difficulty,
                target_elo=target_elo,
                variant=game.variant,
            )
            if ai_move:
                fen_before = game.fen
                ai_result = self.engine.apply_move(
                    fen_before, ai_move.uci, variant=game.variant
                )
                if ai_result:
                    nf, ai_san, _ = ai_result
                    game.fen = nf
                    game.move_count += 1
                    game.pgn = f"1. {ai_san}"
                    game.save()
                    ai_move_record = self._record_move(
                        game,
                        ai_move.uci,
                        ai_san,
                        played_by_white=True,
                        comment="",
                    )
                    pending_comments: list[dict] = []
                    if include_comments:
                        pending_comments.append(
                            _comment_spec(
                                ai_move_record,
                                fen_before,
                                nf,
                                played_by_ai=True,
                                mover_is_white=True,
                            )
                        )
                        schedule_move_comments(str(game.id), pending_comments)
                        game.comments_pending = True
        return game

    def create_friend_game(
        self,
        white,
        black,
        mode="blitz",
        is_timed=True,
        time_minutes=None,
        time_control=None,
        is_rated=True,
        starting_fen=None,
        odds_preset="",
        variant=Game.Variant.STANDARD,
    ):
        timed, white_ms, black_ms, inc_ms, tcm = resolve_time_fields(
            is_timed, time_minutes, time_control=time_control
        )
        chess960_pos = None
        if starting_fen:
            fen = starting_fen
        else:
            fen, chess960_pos = starting_position_for_variant(variant)
        game = Game.objects.create(
            white_player=white,
            black_player=black,
            mode=mode,
            variant=variant,
            chess960_position_id=chess960_pos,
            status=Game.Status.ACTIVE,
            fen=fen,
            is_timed=timed,
            time_control_minutes=tcm,
            white_time_ms=white_ms,
            black_time_ms=black_ms,
            increment_ms=inc_ms,
            is_rated=is_rated,
            odds_preset=odds_preset or "",
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
        telemetry: dict | None = None,
    ) -> dict:
        if game.status != Game.Status.ACTIVE:
            return {"error": "Game is not active"}

        cheat = validate_move_fairplay(game, user, think_ms=spent_ms, telemetry=telemetry)
        if cheat:
            return cheat

        if not game.is_vs_ai:
            from .fairplay_service import estimate_complexity_cp
            from .fairplay_integrity import record_live_move_integrity

            complexity_pre = estimate_complexity_cp(game.fen)
            record_live_move_integrity(
                game,
                user,
                think_ms=spent_ms,
                telemetry=telemetry,
                complexity_cp=complexity_pre,
            )

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
                self._after_human_game_finished(game)
                return {"error": "Time out", "game_over": True}
            if timed_out == "black":
                self._finalize_game_on_timeout(game, winner_white=True)
                game.save()
                self._after_human_game_finished(game)
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
                self._after_human_game_finished(game)
                return {"error": "Time out", "game_over": True}

        result = self.engine.apply_move(game.fen, uci, variant=game.variant)
        if not result:
            return {"error": "Illegal move"}

        new_fen, san, is_over = result
        fen_before_player = game.fen
        from .fairplay_service import estimate_complexity_cp

        complexity_cp = estimate_complexity_cp(fen_before_player) if not game.is_vs_ai else None
        pending_comment_specs: list[dict] = []
        game.fen = new_fen
        move = self._record_move(
            game,
            uci,
            san,
            played_by_white=is_white_turn,
            time_ms=game.white_time_ms if is_white_turn else game.black_time_ms,
            comment="",
            fen_after=new_fen,
            think_ms=spent_ms,
            complexity_cp=complexity_cp,
        )
        if include_comments and game.is_vs_ai:
            pending_comment_specs.append(
                _comment_spec(
                    move,
                    fen_before_player,
                    new_fen,
                    played_by_ai=False,
                    mover_is_white=is_white_turn,
                )
            )
        game.move_count += 1
        game.pgn = (game.pgn or "") + f" {game.move_count}. {san}" if is_white_turn else f" {san}"
        if not game.is_vs_ai and not is_correspondence:
            apply_increment_after_move(game, is_white_turn)
            tick_turn_started(game)
        if is_correspondence and game.status == Game.Status.ACTIVE:
            from .correspondence import refresh_turn_deadline

            refresh_turn_deadline(game)
        game.save()

        if is_correspondence and not is_over and not game.is_vs_ai:
            from .game_actions import try_apply_conditional_response

            auto = try_apply_conditional_response(game, uci)
            if auto and auto.get("move") and not auto.get("error"):
                game.refresh_from_db()
                response["conditional_move"] = auto.get("move")
                response["fen"] = game.fen
                response["game_over"] = auto.get("game_over", False)
                if auto.get("game_over"):
                    response["result"] = game.result
                is_over = auto.get("game_over", is_over)

        if can_claim_threefold_from_game(game):
            finalize_repetition_draw(game)
            game.save()
            self._after_human_game_finished(game)
            if pending_comment_specs:
                schedule_move_comments(str(game.id), pending_comment_specs)
            return {
                "move": move,
                "fen": game.fen,
                "game_over": True,
                "result": game.result,
                "termination_reason": "repetition",
                "draw_claim": "threefold",
                "comments_pending": bool(pending_comment_specs),
            }

        response = {"move": move, "fen": new_fen, "game_over": is_over}

        if game.is_vs_ai and not is_over:
            ai_move = self.engine.get_best_move(
                new_fen,
                game.ai_difficulty,
                target_elo=game.ai_target_elo,
                variant=game.variant,
            )
            if ai_move:
                ai_result = self.engine.apply_move(
                    new_fen, ai_move.uci, variant=game.variant
                )
                if ai_result:
                    nf, ai_san, ai_over = ai_result
                    ai_move_record = self._record_move(
                        game,
                        ai_move.uci,
                        ai_san,
                        played_by_white=not is_white_turn,
                        comment="",
                    )
                    if include_comments:
                        pending_comment_specs.append(
                            _comment_spec(
                                ai_move_record,
                                new_fen,
                                nf,
                                played_by_ai=True,
                                mover_is_white=not is_white_turn,
                            )
                        )
                    self._ai_clock_tick(game, ai_is_white=not is_white_turn)
                    game.fen = nf
                    game.move_count += 1
                    game.save()
                    response["ai_move"] = {"uci": ai_move.uci, "san": ai_san}
                    response["ai_move_record"] = ai_move_record
                    response["fen"] = nf
                    response["game_over"] = ai_over
                    is_over = ai_over

                    if can_claim_threefold_from_game(game):
                        finalize_repetition_draw(game)
                        game.save()
                        self._after_human_game_finished(game)
                        response["game_over"] = True
                        response["result"] = game.result
                        response["termination_reason"] = "repetition"
                        response["draw_claim"] = "threefold"
                        is_over = True

        if is_over:
            self._finalize_game(game)

        if pending_comment_specs:
            schedule_move_comments(str(game.id), pending_comment_specs)
            response["comments_pending"] = True

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
        think_ms=None,
        complexity_cp=None,
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
            think_ms=think_ms,
            complexity_cp=complexity_cp,
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

    def _after_human_game_finished(self, game: Game) -> None:
        """ELO, stats et tournoi après fin de partie (idempotent)."""
        if not game.is_vs_ai and game.white_player and game.black_player:
            self.rating_service.update_ratings(game)
        on_game_completed(game)
        if game.tournament_id:
            try:
                from apps.tournaments.services import TournamentEngine

                TournamentEngine().record_result(game)
            except Exception as exc:
                logger.warning(
                    "Tournament result not recorded for game %s: %s", game.id, exc
                )

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
        self._after_human_game_finished(game)


class MatchmakingService:
    ELO_RANGE = settings.MATCHMAKING_ELO_RANGE

    def _check_fairplay(self, user, is_rated: bool) -> None:
        from .fairplay_exempt import user_is_fairplay_exempt
        from .fairplay_review import user_has_active_matchmaking_block
        from .fairplay_telemetry import user_has_fairplay_consent

        if user_has_active_matchmaking_block(user):
            raise ValueError("Matchmaking bloqué — sanction Fair Play active")
        if is_rated and not user_is_fairplay_exempt(user):
            if not user_has_fairplay_consent(user):
                raise ValueError("Consentement Fair Play requis pour les parties classées")

    def _resolve_time_control(
        self,
        mode: str,
        *,
        is_timed: bool,
        is_rated: bool,
        time_minutes: int | None,
        time_control: str | None,
    ) -> tuple[str, int | None]:
        tc_key = normalize_matchmaking_time_control(
            mode,
            is_timed=is_timed,
            is_rated=is_rated,
            time_minutes=time_minutes,
            time_control=time_control,
        )
        _, _, _, _, tcm = resolve_time_fields(is_timed, time_minutes, time_control=tc_key)
        return tc_key, tcm

    def _create_match(
        self,
        user_a,
        user_b,
        mode: str,
        *,
        is_timed: bool,
        time_minutes: int | None,
        time_control: str | None,
        is_rated: bool,
        variant: str,
    ):
        self.leave_queue(user_a)
        self.leave_queue(user_b)
        return create_matchmaking_game(
            white=user_a,
            black=user_b,
            mode=mode,
            is_timed=is_timed,
            time_minutes=time_minutes,
            time_control=time_control,
            is_rated=is_rated,
            variant=variant,
        )

    def search(
        self,
        user,
        mode: str,
        elo: int,
        is_timed: bool = True,
        time_minutes: int | None = None,
        time_control: str | None = None,
        is_rated: bool = True,
        variant: str = "standard",
    ):
        """Rejoint la file et tente un pairing immédiat (Redis atomique ou PG)."""
        self._check_fairplay(user, is_rated)
        tc_key, tcm = self._resolve_time_control(
            mode,
            is_timed=is_timed,
            is_rated=is_rated,
            time_minutes=time_minutes,
            time_control=time_control,
        )

        from django.contrib.auth import get_user_model

        from . import matchmaking_redis as mmr

        User = get_user_model()
        if mmr.is_redis_matchmaking_available():
            pool = mmr.pool_key(
                mode=mode,
                variant=variant,
                is_timed=is_timed,
                is_rated=is_rated,
                time_control=tc_key or "",
                time_control_minutes=tcm,
            )
            meta = {
                "mode": mode,
                "variant": variant,
                "is_timed": is_timed,
                "is_rated": is_rated,
                "time_control": tc_key or "",
                "time_control_minutes": tcm,
            }
            result = mmr.match_or_enqueue(
                user_id=user.id,
                elo=elo,
                pool=pool,
                meta=meta,
                elo_range=self.ELO_RANGE,
                enqueue_if_no_match=True,
            )
            if result and result.status == "paired" and result.opponent_id:
                opponent = User.objects.get(pk=result.opponent_id)
                return self._create_match(
                    user,
                    opponent,
                    mode,
                    is_timed=is_timed,
                    time_minutes=time_minutes,
                    time_control=tc_key,
                    is_rated=is_rated,
                    variant=variant,
                )
            MatchmakingQueue.objects.update_or_create(
                user=user,
                defaults={
                    "mode": mode,
                    "elo": elo,
                    "is_timed": is_timed,
                    "is_rated": is_rated,
                    "time_control_minutes": tcm,
                    "time_control": tc_key or "",
                    "variant": variant,
                },
            )
            return None

        game = self._find_match_pg(
            user,
            mode,
            elo,
            is_timed=is_timed,
            time_minutes=time_minutes,
            time_control=time_control,
            is_rated=is_rated,
            variant=variant,
        )
        if game:
            return game
        self._join_queue_pg(
            user,
            mode,
            elo,
            is_timed=is_timed,
            time_minutes=time_minutes,
            time_control=time_control,
            is_rated=is_rated,
            variant=variant,
        )
        self.pair_all_waiting()
        return None

    def join_queue(
        self,
        user,
        mode: str,
        elo: int,
        is_timed: bool = True,
        time_minutes: int | None = None,
        time_control: str | None = None,
        is_rated: bool = True,
        variant: str = "standard",
    ):
        self._check_fairplay(user, is_rated)
        tc_key, tcm = self._resolve_time_control(
            mode,
            is_timed=is_timed,
            is_rated=is_rated,
            time_minutes=time_minutes,
            time_control=time_control,
        )
        from . import matchmaking_redis as mmr
        from .fairplay_integrity import user_in_shadow_pool

        shadow = user_in_shadow_pool(user) if is_rated else False
        if mmr.is_redis_matchmaking_available():
            pool = mmr.pool_key(
                mode=mode,
                variant=variant,
                is_timed=is_timed,
                is_rated=is_rated,
                time_control=tc_key or "",
                time_control_minutes=tcm,
                shadow_pool=shadow,
            )
            meta = {
                "mode": mode,
                "variant": variant,
                "is_timed": is_timed,
                "is_rated": is_rated,
                "time_control": tc_key or "",
                "time_control_minutes": tcm,
            }
            mmr.match_or_enqueue(
                user_id=user.id,
                elo=elo,
                pool=pool,
                meta=meta,
                elo_range=self.ELO_RANGE,
                enqueue_if_no_match=True,
            )
        MatchmakingQueue.objects.update_or_create(
            user=user,
            defaults={
                "mode": mode,
                "elo": elo,
                "is_timed": is_timed,
                "is_rated": is_rated,
                "time_control_minutes": tcm,
                "time_control": tc_key or "",
                "variant": variant,
            },
        )

    def leave_queue(self, user):
        MatchmakingQueue.objects.filter(user=user).delete()
        from . import matchmaking_redis as mmr

        mmr.leave_user(user.id)

    def find_match(
        self,
        user,
        mode: str,
        elo: int,
        is_timed: bool = True,
        time_minutes: int | None = None,
        time_control: str | None = None,
        is_rated: bool = True,
        variant: str = "standard",
    ):
        self._check_fairplay(user, is_rated)
        tc_key, tcm = self._resolve_time_control(
            mode,
            is_timed=is_timed,
            is_rated=is_rated,
            time_minutes=time_minutes,
            time_control=time_control,
        )

        from django.contrib.auth import get_user_model

        from . import matchmaking_redis as mmr

        User = get_user_model()
        if mmr.is_redis_matchmaking_available():
            pool = mmr.pool_key(
                mode=mode,
                variant=variant,
                is_timed=is_timed,
                is_rated=is_rated,
                time_control=tc_key or "",
                time_control_minutes=tcm,
            )
            meta = {
                "mode": mode,
                "variant": variant,
                "is_timed": is_timed,
                "is_rated": is_rated,
                "time_control": tc_key or "",
                "time_control_minutes": tcm,
            }
            result = mmr.match_or_enqueue(
                user_id=user.id,
                elo=elo,
                pool=pool,
                meta=meta,
                elo_range=self.ELO_RANGE,
                enqueue_if_no_match=False,
            )
            if result and result.status == "paired" and result.opponent_id:
                opponent = User.objects.get(pk=result.opponent_id)
                return self._create_match(
                    user,
                    opponent,
                    mode,
                    is_timed=is_timed,
                    time_minutes=time_minutes,
                    time_control=tc_key,
                    is_rated=is_rated,
                    variant=variant,
                )
            return None

        return self._find_match_pg(
            user,
            mode,
            elo,
            is_timed=is_timed,
            time_minutes=time_minutes,
            time_control=time_control,
            is_rated=is_rated,
            variant=variant,
        )

    def _join_queue_pg(
        self,
        user,
        mode: str,
        elo: int,
        is_timed: bool = True,
        time_minutes: int | None = None,
        time_control: str | None = None,
        is_rated: bool = True,
        variant: str = "standard",
    ):
        tc_key, tcm = self._resolve_time_control(
            mode,
            is_timed=is_timed,
            is_rated=is_rated,
            time_minutes=time_minutes,
            time_control=time_control,
        )
        MatchmakingQueue.objects.update_or_create(
            user=user,
            defaults={
                "mode": mode,
                "elo": elo,
                "is_timed": is_timed,
                "is_rated": is_rated,
                "time_control_minutes": tcm,
                "time_control": tc_key or "",
                "variant": variant,
            },
        )

    def _find_match_pg(
        self,
        user,
        mode: str,
        elo: int,
        is_timed: bool = True,
        time_minutes: int | None = None,
        time_control: str | None = None,
        is_rated: bool = True,
        variant: str = "standard",
    ):
        tc_key, tcm = self._resolve_time_control(
            mode,
            is_timed=is_timed,
            is_rated=is_rated,
            time_minutes=time_minutes,
            time_control=time_control,
        )
        candidates = MatchmakingQueue.objects.filter(
            mode=mode,
            is_timed=is_timed,
            is_rated=is_rated,
            variant=variant,
            time_control_minutes=tcm,
            time_control=tc_key or "",
            elo__gte=elo - self.ELO_RANGE,
            elo__lte=elo + self.ELO_RANGE,
        ).exclude(user=user).order_by("joined_at")

        for candidate in candidates[:5]:
            opponent = candidate.user
            return self._create_match(
                user,
                opponent,
                mode,
                is_timed=is_timed,
                time_minutes=time_minutes,
                time_control=tc_key,
                is_rated=is_rated,
                variant=variant,
            )
        return None

    def cleanup_stale(self, minutes=10):
        cutoff = timezone.now() - timedelta(minutes=minutes)
        stale_users = list(
            MatchmakingQueue.objects.filter(joined_at__lt=cutoff).values_list("user_id", flat=True)
        )
        MatchmakingQueue.objects.filter(joined_at__lt=cutoff).delete()
        from . import matchmaking_redis as mmr

        for uid in stale_users:
            mmr.leave_user(uid)

    def pair_all_waiting(self):
        """Réconciliation PG (+ Redis si disponible)."""
        self.cleanup_stale()
        from . import matchmaking_redis as mmr

        if mmr.is_redis_matchmaking_available():
            return self._pair_all_waiting_pg()
        return self._pair_all_waiting_pg()

    def _pair_all_waiting_pg(self):
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
                    if a.is_rated != b.is_rated:
                        continue
                    if a.time_control_minutes != b.time_control_minutes:
                        continue
                    if (a.time_control or "") != (b.time_control or ""):
                        continue
                    if a.variant != b.variant:
                        continue
                    diff = abs(a.elo - b.elo)
                    if diff <= self.ELO_RANGE and diff < best_diff:
                        best = b
                        best_diff = diff
                if best:
                    used.add(a.user_id)
                    used.add(best.user_id)
                    game = self._create_match(
                        a.user,
                        best.user,
                        mode,
                        is_timed=a.is_timed,
                        time_control=a.time_control or None,
                        is_rated=a.is_rated,
                        variant=a.variant,
                    )
                    self._notify_match(a.user_id, best.user_id, game)

    def searching_count(self) -> int:
        from . import matchmaking_redis as mmr

        count = mmr.searching_count()
        if count:
            return count
        return MatchmakingQueue.objects.count()

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
        try:
            from apps.notifications.services import create_match_found_notifications

            create_match_found_notifications(user_a_id, user_b_id, game)
        except Exception as exc:
            logger.warning("Match found push notification failed: %s", exc)
