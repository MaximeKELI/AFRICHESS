"""Classement provisoire — 5 parties en ligne avant classement établi."""

from __future__ import annotations

from .constants import PROVISIONAL_GAMES_REQUIRED, RATED_MODES
from .models import PlayerRating


def is_provisional(rating: PlayerRating | None) -> bool:
    if rating is None:
        return True
    if rating.mode not in RATED_MODES:
        return False
    return rating.games_count < PROVISIONAL_GAMES_REQUIRED


def games_until_established(rating: PlayerRating | None) -> int:
    if rating is None:
        return PROVISIONAL_GAMES_REQUIRED
    if rating.mode not in RATED_MODES:
        return 0
    return max(0, PROVISIONAL_GAMES_REQUIRED - rating.games_count)


def is_established(rating: PlayerRating | None) -> bool:
    return not is_provisional(rating)


def rating_for_user(user, mode: str) -> PlayerRating | None:
    return PlayerRating.objects.filter(user=user, mode=mode).first()


def player_rating_info(user, mode: str) -> dict:
    """ELO affiché + statut provisoire pour un joueur/mode."""
    rating = rating_for_user(user, mode)
    elo = rating.elo if rating else user.initial_elo
    return {
        "elo": elo,
        "is_provisional": is_provisional(rating),
        "games_count": rating.games_count if rating else 0,
        "games_until_established": games_until_established(rating),
        "is_established": is_established(rating),
    }
