"""Initialisation unique d'un nouvel utilisateur (évite les doublons signal + vue)."""

from apps.ratings.models import PlayerRating

from .models import User, UserStats


def setup_new_user(user: User) -> None:
    UserStats.objects.get_or_create(user=user)
    try:
        from apps.learning.models import LearningProfile

        LearningProfile.objects.get_or_create(user=user)
    except Exception as exc:
        import logging

        logging.getLogger(__name__).warning("UserStats setup failed: %s", exc)
    elo = user.initial_elo
    for mode in ("bullet", "blitz", "rapid", "classical"):
        PlayerRating.objects.get_or_create(
            user=user,
            mode=mode,
            defaults={"elo": elo, "peak_elo": elo},
        )
