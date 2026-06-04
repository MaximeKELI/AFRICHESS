"""Utilitaires salles de jeu (sans import circulaire)."""

from django.utils import timezone

from .models import Game, GameRoom


def uci_to_squares(uci: str) -> tuple[str, str]:
    uci = (uci or "").strip().lower()
    if len(uci) >= 4:
        return uci[:2], uci[2:4]
    return "", ""


def ensure_game_room(game: Game) -> GameRoom:
    room, _ = GameRoom.objects.get_or_create(
        game=game,
        defaults={"room_id": game.id},
    )
    return room


def current_turn(game: Game) -> str:
    return "white" if " w " in (game.fen or "") else "black"


def set_player_connected(game: Game, user, connected: bool) -> GameRoom:
    room = ensure_game_room(game)
    if game.white_player_id == user.id:
        room.white_connected = connected
        room.white_disconnected_at = None if connected else timezone.now()
    elif game.black_player_id == user.id:
        room.black_connected = connected
        room.black_disconnected_at = None if connected else timezone.now()
    room.last_activity = timezone.now()
    room.save(
        update_fields=[
            "white_connected",
            "black_connected",
            "white_disconnected_at",
            "black_disconnected_at",
            "last_activity",
        ]
    )
    return room


def try_start_game(game: Game) -> Game:
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
