from django.conf import settings
from django.db import models


class PlayerRating(models.Model):
    class Mode(models.TextChoices):
        BULLET = "bullet", "Bullet"
        BLITZ = "blitz", "Blitz"
        RAPID = "rapid", "Rapid"
        CLASSICAL = "classical", "Classical"
        PUZZLE = "puzzle", "Puzzle"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ratings")
    mode = models.CharField(max_length=20, choices=Mode.choices)
    elo = models.PositiveIntegerField(default=1200)
    peak_elo = models.PositiveIntegerField(default=1200)
    games_count = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "mode"]
        indexes = [models.Index(fields=["mode", "-elo"])]

    def __str__(self):
        return f"{self.user.username} — {self.mode}: {self.elo}"


class LeagueSeason(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    is_active = models.BooleanField(default=True)
    started_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return self.name


class LeagueStanding(models.Model):
    class Tier(models.TextChoices):
        WOOD = "wood", "Wood"
        STONE = "stone", "Stone"
        BRONZE = "bronze", "Bronze"
        SILVER = "silver", "Silver"
        GOLD = "gold", "Gold"
        PLATINUM = "platinum", "Platinum"
        DIAMOND = "diamond", "Diamond"
        LEGEND = "legend", "Legend"

    TIER_ORDER = [
        Tier.WOOD,
        Tier.STONE,
        Tier.BRONZE,
        Tier.SILVER,
        Tier.GOLD,
        Tier.PLATINUM,
        Tier.DIAMOND,
        Tier.LEGEND,
    ]

    season = models.ForeignKey(
        LeagueSeason, on_delete=models.CASCADE, related_name="standings"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="league_standings"
    )
    tier = models.CharField(max_length=20, choices=Tier.choices, default=Tier.WOOD)
    points = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    draws = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    games = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["season", "user"]
        indexes = [
            models.Index(fields=["season", "tier", "-points"]),
            models.Index(fields=["season", "-points"]),
        ]

    def __str__(self):
        return f"{self.user_id} — {self.tier} ({self.points} pts)"


class RatingHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    mode = models.CharField(max_length=20)
    elo_before = models.PositiveIntegerField()
    elo_after = models.PositiveIntegerField()
    change = models.IntegerField()
    game = models.ForeignKey("games.Game", on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
