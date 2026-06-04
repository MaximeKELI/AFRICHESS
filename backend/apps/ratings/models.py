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
