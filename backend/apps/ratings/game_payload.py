"""Sérialisation des changements ELO pour une partie terminée."""

from __future__ import annotations

from apps.games.models import Game


def rating_changes_for_game(game: Game) -> dict | None:
    """Retourne les deltas ELO par couleur, ou None si non applicable."""
    if game.is_vs_ai or not game.is_rated:
        return None
    if game.status != Game.Status.COMPLETED:
        return None

    from apps.ratings.models import RatingHistory

    histories = RatingHistory.objects.filter(game_id=game.pk)
    if not histories.exists():
        return None

    out: dict = {}
    for hist in histories:
        if hist.user_id == game.white_player_id:
            side = "white"
        elif hist.user_id == game.black_player_id:
            side = "black"
        else:
            continue
        out[side] = {
            "user_id": hist.user_id,
            "elo_before": hist.elo_before,
            "elo_after": hist.elo_after,
            "change": hist.change,
        }
    return out if out else None
