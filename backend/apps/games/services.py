"""Game business logic: creation, moves, matchmaking."""
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.ratings.services import RatingService

from .commentary import generate_move_comment
from .elo_config import elo_to_difficulty_label, resolve_ai_target_elo
from .engine import ChessEngineService
from .models import Game, MatchmakingQueue, Move

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
        difficulty=5,
        color="white",
        include_comments=False,
    ):
        config = MODE_TIME_CONFIG.get(mode, MODE_TIME_CONFIG["blitz"])
        target_elo = resolve_ai_target_elo(user, mode=mode, difficulty=difficulty)
        display_difficulty = elo_to_difficulty_label(target_elo)

        game = Game.objects.create(
            white_player=user if color == "white" else None,
            black_player=None if color == "white" else user,
            mode=Game.Mode.AI,
            status=Game.Status.ACTIVE,
            is_vs_ai=True,
            ai_difficulty=display_difficulty,
            ai_target_elo=target_elo,
            white_time_ms=config["initial_ms"],
            black_time_ms=config["initial_ms"],
            increment_ms=config["increment_ms"],
            started_at=timezone.now(),
        )
        if color == "black":
            ai_move = self.engine.get_best_move(
                game.fen, display_difficulty, target_elo=target_elo
            )
            if ai_move:
                self._record_move(game, ai_move.uci, ai_move.san, played_by_white=True)
        return game

    def create_friend_game(self, white, black, mode="blitz"):
        config = MODE_TIME_CONFIG.get(mode, MODE_TIME_CONFIG["blitz"])
        return Game.objects.create(
            white_player=white,
            black_player=black,
            mode=mode,
            status=Game.Status.ACTIVE,
            white_time_ms=config["initial_ms"],
            black_time_ms=config["initial_ms"],
            increment_ms=config["increment_ms"],
            started_at=timezone.now(),
        )

    @transaction.atomic
    def make_move(self, game: Game, user, uci: str) -> dict:
        if game.status != Game.Status.ACTIVE:
            return {"error": "Game is not active"}

        is_white_turn = " w " in game.fen
        if is_white_turn and game.white_player != user:
            return {"error": "Not your turn"}
        if not is_white_turn and game.black_player != user and not game.is_vs_ai:
            return {"error": "Not your turn"}

        result = self.engine.apply_move(game.fen, uci)
        if not result:
            return {"error": "Illegal move"}

        new_fen, san, is_over = result
        move = self._record_move(
            game, uci, san, played_by_white=is_white_turn,
            time_ms=game.white_time_ms if is_white_turn else game.black_time_ms,
        )
        game.fen = new_fen
        game.move_count += 1
        game.pgn = (game.pgn or "") + f" {game.move_count}. {san}" if is_white_turn else f" {san}"
        game.save()

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
                    self._record_move(game, ai_move.uci, ai_san, played_by_white=not is_white_turn)
                    game.fen = nf
                    game.move_count += 1
                    game.save()
                    response["ai_move"] = {"uci": ai_move.uci, "san": ai_san}
                    response["fen"] = nf
                    response["game_over"] = ai_over
                    is_over = ai_over

        if is_over:
            self._finalize_game(game)

        return response

    def _record_move(self, game, uci, san, played_by_white, time_ms=None):
        return Move.objects.create(
            game=game,
            move_number=game.move_count + 1,
            san=san,
            uci=uci,
            fen_after=game.fen,
            played_by_white=played_by_white,
            time_remaining_ms=time_ms,
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
        if not game.is_vs_ai and game.white_player and game.black_player:
            self.rating_service.update_ratings(game)


class MatchmakingService:
    ELO_RANGE = settings.MATCHMAKING_ELO_RANGE

    def join_queue(self, user, mode: str, elo: int):
        MatchmakingQueue.objects.update_or_create(
            user=user,
            defaults={"mode": mode, "elo": elo},
        )

    def leave_queue(self, user):
        MatchmakingQueue.objects.filter(user=user).delete()

    def find_match(self, user, mode: str, elo: int):
        candidates = MatchmakingQueue.objects.filter(
            mode=mode,
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
            )
        return None

    def cleanup_stale(self, minutes=10):
        cutoff = timezone.now() - timedelta(minutes=minutes)
        MatchmakingQueue.objects.filter(joined_at__lt=cutoff).delete()
