"""Chronomètre autoritaire côté serveur."""

from django.utils import timezone

from .models import Game


def apply_server_clock_before_move(game: Game) -> None:
    """Déduit le temps écoulé depuis turn_started_at au joueur au trait."""
    if not game.turn_started_at or game.is_vs_ai:
        return
    now = timezone.now()
    elapsed_ms = int((now - game.turn_started_at).total_seconds() * 1000)
    is_white = " w " in (game.fen or "")
    if is_white:
        game.white_time_ms = max(0, game.white_time_ms - elapsed_ms)
    else:
        game.black_time_ms = max(0, game.black_time_ms - elapsed_ms)


def tick_turn_started(game: Game) -> None:
    game.turn_started_at = timezone.now()


def apply_increment_after_move(game: Game, mover_was_white: bool) -> None:
    if game.is_vs_ai:
        return
    inc = game.increment_ms or 0
    if mover_was_white:
        game.white_time_ms += inc
    else:
        game.black_time_ms += inc


def check_timeout(game: Game) -> str | None:
    """Retourne 'white' ou 'black' si temps écoulé."""
    if " w " in (game.fen or ""):
        if game.white_time_ms <= 0:
            return "white"
    else:
        if game.black_time_ms <= 0:
            return "black"
    return None
