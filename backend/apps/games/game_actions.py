"""Actions de partie : nulle, rematch, liste live."""

from django.utils import timezone

from .models import Game
from .room_utils import ensure_game_room
from .services import GameService, MODE_TIME_CONFIG


def offer_draw(game: Game, user) -> dict:
    if game.status != Game.Status.ACTIVE or game.is_vs_ai:
        return {"error": "Impossible"}
    if user.id not in (game.white_player_id, game.black_player_id):
        return {"error": "Non participant"}
    game.draw_offered_by = user
    game.save(update_fields=["draw_offered_by"])
    return {"ok": True, "offered_by": user.id}


def accept_draw(game: Game, user) -> dict:
    if not game.draw_offered_by_id or game.draw_offered_by_id == user.id:
        return {"error": "Aucune proposition adverse"}
    if user.id not in (game.white_player_id, game.black_player_id):
        return {"error": "Non participant"}
    game.result = Game.Result.DRAW
    game.status = Game.Status.COMPLETED
    game.ended_at = timezone.now()
    game.termination_reason = "draw_agreement"
    game.draw_offered_by = None
    game.save()
    if game.white_player and game.black_player:
        GameService().rating_service.update_ratings(game)
    try:
        from apps.tournaments.services import TournamentEngine

        TournamentEngine().record_result(game)
    except Exception:
        pass
    return {"ok": True, "result": "1/2-1/2"}


def decline_draw(game: Game, user) -> dict:
    game.draw_offered_by = None
    game.save(update_fields=["draw_offered_by"])
    return {"ok": True}


def create_rematch(game: Game, user) -> Game | None:
    if user.id not in (game.white_player_id, game.black_player_id):
        return None
    config = MODE_TIME_CONFIG.get(game.mode, MODE_TIME_CONFIG["blitz"])
    new_game = Game.objects.create(
        white_player=game.black_player,
        black_player=game.white_player,
        mode=game.mode,
        status=Game.Status.ACTIVE,
        white_time_ms=config["initial_ms"],
        black_time_ms=config["initial_ms"],
        increment_ms=config["increment_ms"],
        started_at=timezone.now(),
        turn_started_at=timezone.now(),
        rematch_of=game,
    )
    ensure_game_room(new_game)
    return new_game


def live_games_queryset():
    return Game.objects.filter(
        status=Game.Status.ACTIVE, is_vs_ai=False
    ).select_related("white_player", "black_player")[:30]
