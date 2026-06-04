from apps.ratings.models import PlayerRating

from .models import User


def init_user_ratings(user: User):
    """Create initial ELO ratings from the user's declared chess level."""
    elo = user.initial_elo
    for mode in ("bullet", "blitz", "rapid", "classical"):
        PlayerRating.objects.get_or_create(
            user=user,
            mode=mode,
            defaults={"elo": elo, "peak_elo": elo},
        )
