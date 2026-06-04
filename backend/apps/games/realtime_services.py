"""Salles de jeu, état temps réel et matchmaking WebSocket."""

from __future__ import annotations

import uuid

import chess
from django.utils import timezone

from .models import Game, GameRoom, Move
from .serializers import GameSerializer
from .services import GameService, MatchmakingService, MODE_TIME_CONFIG


def uci_to_squares(uci: str) -> tuple[str, str]:
    uci = (uci or "").strip().lower()
    if len(uci) >= 4:
        return uci[:2], uci[2:4]
    return "", ""


def current_turn(game: Game) -> str:
    return "white" if " w " in (game.fen or "") else "black"


def ensure_game_room(game: Game) -> GameRoom:
    room, _ = GameRoom.objects.get_or_create(
        game=game,
        defaults={"room_id": game.id},
    )
    return room


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


def set_player_connected(game: Game, user, connected: bool) -> GameRoom:
    room = ensure_game_room(game)
    if game.white_player_id == user.id:
        room.white_connected = connected
    elif game.black_player_id == user.id:
        room.black_connected = connected
    room.last_activity = timezone.now()
    room.save(
        update_fields=["white_connected", "black_connected", "last_activity"]
    )
    return room


def try_start_game(game: Game) -> Game:
    """Passe waiting → active si les deux joueurs sont présents."""
    if game.status != Game.Status.WAITING:
        return game
    if not game.white_player_id or not game.black_player_id:
        return game
    room = ensure_game_room(game)
    if room.white_connected and room.black_connected:
        game.status = Game.Status.ACTIVE
        game.started_at = game.started_at or timezone.now()
        game.save(update_fields=["status", "started_at"])
    return game


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


def restore_game_state(game_id) -> dict | None:
    try:
        game = Game.objects.get(pk=game_id)
    except Game.DoesNotExist:
        return None
    return serialize_game(game)


class RealtimeMatchmakingService(MatchmakingService):
    """Matchmaking avec création de salle et notification WS."""

    def find_and_create(self, user, mode: str, elo: int):
        self.join_queue(user, mode, elo)
        game = self.find_match(user, mode, elo)
        if game:
            ensure_game_room(game)
        return game
