from django.conf import settings
from django.db import models


class Puzzle(models.Model):
    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"
        EXPERT = "expert", "Expert"

    fen = models.CharField(max_length=100)
    solution_moves = models.JSONField(help_text="List of UCI moves for solution")
    themes = models.JSONField(default=list)  # fork, pin, mate, etc.
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    rating = models.PositiveIntegerField(default=1200)
    plays_count = models.PositiveIntegerField(default=0)
    success_rate = models.FloatField(default=0.0)
    is_daily = models.BooleanField(default=False)
    daily_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_daily", "daily_date"]),
            models.Index(fields=["difficulty"]),
        ]

    def __str__(self):
        return f"Puzzle #{self.pk} ({self.difficulty})"


class PuzzleAttempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    puzzle = models.ForeignKey(Puzzle, on_delete=models.CASCADE, related_name="attempts")
    solved = models.BooleanField(default=False)
    moves_played = models.JSONField(default=list)
    time_seconds = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "puzzle", "created_at"]
        indexes = [
            models.Index(fields=["user", "solved"]),
        ]
