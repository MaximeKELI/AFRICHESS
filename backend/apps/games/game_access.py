"""Contrôle d'accès aux parties."""

from django.contrib.auth.models import AnonymousUser

from .models import Game


def user_is_participant(user, game: Game) -> bool:
    if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
        return False
    return user.id in (game.white_player_id, game.black_player_id)


def can_view_game(user, game: Game) -> bool:
    """Replay public ; parties actives / TV visibles en spectateur."""
    # Exhibitions AFRICHESS TV : toujours visibles (stats + spectateurs)
    if getattr(game, "is_tv_exhibition", False):
        return True
    if game.status in (
        Game.Status.COMPLETED,
        Game.Status.ACTIVE,
        Game.Status.DRAW,
    ):
        return True
    return user_is_participant(user, game)


def can_play_game(user, game: Game) -> bool:
    return user_is_participant(user, game)


def can_analyze_game(user, game: Game) -> bool:
    return user_is_participant(user, game)
