"""État temps réel et sérialisation pour WebSockets."""

from __future__ import annotations

from django.utils import timezone

from .models import Game
from .room_utils import current_turn, ensure_game_room
from .serializers import GameSerializer
from .services import MatchmakingService, MODE_TIME_CONFIG


def serialize_game(game: Game) -> dict:
    game = Game.objects.prefetch_related("moves").select_related(
        "white_player", "black_player"
    ).get(pk=game.pk)
    data = GameSerializer(game).data
    data["turn"] = current_turn(game)
    data["room_id"] = str(ensure_game_room(game).room_id)
    return data


def build_ws_payload(game: Game, extra: dict | None = None) -> dict:
    payload = {"game": serialize_game(game)}
    if extra:
        payload.update(extra)
    return payload


def restore_game_state(game_id) -> dict | None:
    try:
        game = Game.objects.get(pk=game_id)
    except Game.DoesNotExist:
        return None
    return serialize_game(game)


def create_matchmaking_game(white, black, mode: str) -> Game:
    config = MODE_TIME_CONFIG.get(mode, MODE_TIME_CONFIG["blitz"])
    game = Game.objects.create(
        white_player=white,
        black_player=black,
        mode=mode,
        status=Game.Status.ACTIVE,
        white_time_ms=config["initial_ms"],
        black_time_ms=config["initial_ms"],
        increment_ms=config["increment_ms"],
        started_at=timezone.now(),
    )
    ensure_game_room(game)
    return game


class RealtimeMatchmakingService(MatchmakingService):
    def find_and_create(self, user, mode: str, elo: int):
        self.join_queue(user, mode, elo)
        game = self.find_match(user, mode, elo)
        if game:
            ensure_game_room(game)
        return game
