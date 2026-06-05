"""Ligues saisonnières — points, promotion, classement."""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.ratings.models import LeagueSeason, LeagueStanding, PlayerRating

User = get_user_model()

POINTS_WIN = 10
POINTS_DRAW = 3
POINTS_LOSS = 0
PROMOTION_THRESHOLD = 100

TIER_BY_ELO = (
    (2000, LeagueStanding.Tier.LEGEND),
    (1800, LeagueStanding.Tier.DIAMOND),
    (1600, LeagueStanding.Tier.PLATINUM),
    (1400, LeagueStanding.Tier.GOLD),
    (1200, LeagueStanding.Tier.SILVER),
    (1000, LeagueStanding.Tier.BRONZE),
    (800, LeagueStanding.Tier.STONE),
    (0, LeagueStanding.Tier.WOOD),
)


def tier_for_elo(elo: int) -> str:
    for threshold, tier in TIER_BY_ELO:
        if elo >= threshold:
            return tier
    return LeagueStanding.Tier.WOOD


def get_or_create_active_season() -> LeagueSeason:
    season = LeagueSeason.objects.filter(is_active=True).order_by("-started_at").first()
    if season:
        return season
    now = timezone.now()
    return LeagueSeason.objects.create(
        name="Saison 1 — Ligue AFRICHESS",
        slug="season-1",
        is_active=True,
        started_at=now,
        ends_at=now + timedelta(days=90),
    )


def _next_tier(current: str) -> str | None:
    order = LeagueStanding.TIER_ORDER
    try:
        idx = order.index(current)
    except ValueError:
        return None
    if idx >= len(order) - 1:
        return None
    return order[idx + 1]


def get_or_create_standing(user, season: LeagueSeason | None = None) -> LeagueStanding:
    season = season or get_or_create_active_season()
    standing, created = LeagueStanding.objects.get_or_create(
        season=season,
        user=user,
        defaults={"tier": LeagueStanding.Tier.WOOD},
    )
    if created:
        rating = PlayerRating.objects.filter(user=user, mode="blitz").first()
        elo = rating.elo if rating else user.initial_elo
        standing.tier = tier_for_elo(elo)
        standing.save(update_fields=["tier"])
    return standing


@transaction.atomic
def record_league_result(user, outcome: str) -> LeagueStanding | None:
    """Enregistre le résultat d'une partie classée pour la ligue active."""
    if not user or not getattr(user, "id", None):
        return None
    season = get_or_create_active_season()
    standing = get_or_create_standing(user, season)
    standing.games += 1
    if outcome == "win":
        standing.wins += 1
        standing.points += POINTS_WIN
    elif outcome == "draw":
        standing.draws += 1
        standing.points += POINTS_DRAW
    else:
        standing.losses += 1
        standing.points += POINTS_LOSS

    while standing.points >= PROMOTION_THRESHOLD:
        nxt = _next_tier(standing.tier)
        if not nxt:
            standing.points = PROMOTION_THRESHOLD
            break
        standing.points -= PROMOTION_THRESHOLD
        standing.tier = nxt

    standing.save()
    return standing


def league_standings_for_season(season: LeagueSeason, tier: str | None = None, limit: int = 50):
    qs = LeagueStanding.objects.filter(season=season).select_related("user", "user__stats")
    if tier:
        qs = qs.filter(tier=tier)
    return qs.order_by("-points", "-wins")[:limit]
