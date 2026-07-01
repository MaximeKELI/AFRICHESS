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
    themes = models.JSONField(default=list)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    rating = models.PositiveIntegerField(default=1200)
    plays_count = models.PositiveIntegerField(default=0)
    success_rate = models.FloatField(default=0.0)
    is_daily = models.BooleanField(default=False)
    daily_date = models.DateField(null=True, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="custom_puzzles",
    )
    is_public = models.BooleanField(default=False)
    source = models.CharField(max_length=20, default="seed")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_daily", "daily_date"]),
            models.Index(fields=["difficulty"]),
            models.Index(fields=["difficulty", "rating"]),
            models.Index(fields=["source"]),
            models.Index(fields=["author", "source"]),
        ]

    def __str__(self):
        return f"Puzzle #{self.pk} ({self.difficulty})"


class PuzzleRushSession(models.Model):
    """Session Puzzle Rush côté serveur."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    puzzle_ids = models.JSONField(default=list)
    current_index = models.PositiveSmallIntegerField(default=0)
    score = models.PositiveSmallIntegerField(default=0)
    misses = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    started_at = models.DateTimeField(auto_now_add=True)
    ends_at = models.DateTimeField()

    class Meta:
        indexes = [models.Index(fields=["user", "-started_at"])]


class PuzzleBattle(models.Model):
    """Duel 1v1 sur puzzles."""

    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"

    player1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="battles_as_p1",
    )
    player2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="battles_as_p2",
    )
    puzzle_ids = models.JSONField(default=list)
    current_index = models.PositiveSmallIntegerField(default=0)
    score1 = models.PositiveSmallIntegerField(default=0)
    score2 = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="battles_won",
    )
    created_at = models.DateTimeField(auto_now_add=True)


class PuzzleBattleQueue(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)


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
