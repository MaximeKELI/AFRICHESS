"""Ajustement ELO IA selon les dernières parties vs ordinateur."""

from django.db import models

from .elo_config import clamp_elo, resolve_ai_target_elo
from .models import Game


def adapt_ai_elo_from_history(user, base_elo: int, mode: str = "blitz") -> int:
    """
    Monte ou baisse l'ELO suggéré selon les 10 dernières parties IA.
    Victoire joueur → IA +80 max ; défaites → IA -60 max.
    """
    games = (
        Game.objects.filter(
            is_vs_ai=True,
            status=Game.Status.COMPLETED,
        )
        .filter(models.Q(white_player=user) | models.Q(black_player=user))
        .order_by("-ended_at")[:10]
    )

    if not games:
        return base_elo

    wins = 0
    losses = 0
    for g in games:
        if g.result in (Game.Result.DRAW,):
            continue
        user_is_white = g.white_player_id == user.id
        user_won = (
            g.result == Game.Result.WHITE_WIN and user_is_white
        ) or (g.result == Game.Result.BLACK_WIN and not user_is_white)
        if user_won:
            wins += 1
        else:
            losses += 1

    delta = wins * 80 - losses * 60
    return clamp_elo(base_elo + delta)


def resolve_final_ai_elo(
    user,
    mode: str = "blitz",
    difficulty: int | None = None,
    ai_elo: int | None = None,
    *,
    adapt: bool = True,
) -> int:
    """ELO IA final : choix joueur ou palier selon classement, puis ajustement historique."""
    base = resolve_ai_target_elo(user, mode=mode, difficulty=difficulty, ai_elo=ai_elo)
    if not adapt:
        return base
    return adapt_ai_elo_from_history(user, base, mode=mode)
