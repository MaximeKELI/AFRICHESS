"""Affichage rating Glicko-2 ± RD pour API."""

from django.conf import settings

from .constants import PROVISIONAL_GAMES_REQUIRED


def format_rating_display(elo: int, rd: float, games_count: int = 0) -> str:
    """Format Lichess-style : 1847 ± 42 ou 1847? si provisoire."""
    provisional = games_count < PROVISIONAL_GAMES_REQUIRED
    if not getattr(settings, "USE_GLICKO2", False):
        return f"{elo}?" if provisional else str(elo)
    if provisional or rd > 110:
        return f"{elo}?"
    rd_int = max(1, int(round(rd)))
    return f"{elo} ± {rd_int}"
