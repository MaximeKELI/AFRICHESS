import uuid

from django.conf import settings
from django.db import models


class Game(models.Model):
    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting for opponent"
        ACTIVE = "active", "In progress"
        COMPLETED = "completed", "Completed"
        ABORTED = "aborted", "Aborted"
        DRAW = "draw", "Draw"

    class Mode(models.TextChoices):
        BULLET = "bullet", "Bullet (1+0)"
        BLITZ = "blitz", "Blitz (3+2)"
        RAPID = "rapid", "Rapid (10+0)"
        CLASSICAL = "classical", "Classical (30+0)"
        AI = "ai", "vs Computer"
        PUZZLE = "puzzle", "Puzzle"

    class Result(models.TextChoices):
        WHITE_WIN = "1-0", "White wins"
        BLACK_WIN = "0-1", "Black wins"
        DRAW = "1/2-1/2", "Draw"
        ABORTED = "*", "Aborted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    white_player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="games_as_white",
    )
    black_player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="games_as_black",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    mode = models.CharField(max_length=20, choices=Mode.choices, default=Mode.BLITZ)
    result = models.CharField(max_length=10, choices=Result.choices, blank=True)
    fen = models.CharField(max_length=100, default="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
    pgn = models.TextField(blank=True)
    move_count = models.PositiveSmallIntegerField(default=0)
    white_time_ms = models.PositiveIntegerField(default=180000)
    black_time_ms = models.PositiveIntegerField(default=180000)
    increment_ms = models.PositiveIntegerField(default=2000)
    is_timed = models.BooleanField(
        default=True,
        help_text="False = partie sans chronomètre",
    )
    time_control_minutes = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="5, 10, 15, 20, 25 ou 30 si is_timed",
    )
    is_vs_ai = models.BooleanField(default=False)
    ai_difficulty = models.PositiveSmallIntegerField(default=10)  # 1-20 (affichage)
    ai_target_elo = models.PositiveIntegerField(
        default=1200,
        help_text="ELO UCI de l'IA pour cette partie",
    )
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="games_won",
    )
    termination_reason = models.CharField(max_length=50, blank=True)
    tournament = models.ForeignKey(
        "tournaments.Tournament",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="games",
    )
    turn_started_at = models.DateTimeField(null=True, blank=True)
    draw_offered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="draw_offers_made",
    )
    rematch_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rematches",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "mode"]),
            models.Index(fields=["white_player", "black_player"]),
        ]

    def __str__(self):
        return f"Game {self.id} ({self.mode})"


class GameRoom(models.Model):
    """Salle temps réel — room_id = identifiant WebSocket (souvent = game.id)."""

    game = models.OneToOneField(Game, on_delete=models.CASCADE, related_name="room")
    room_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    white_connected = models.BooleanField(default=False)
    black_connected = models.BooleanField(default=False)
    white_disconnected_at = models.DateTimeField(null=True, blank=True)
    black_disconnected_at = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Salle de jeu"
        verbose_name_plural = "Salles de jeu"

    def __str__(self):
        return f"Room {self.room_id} (game {self.game_id})"


class Move(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="moves")
    move_number = models.PositiveSmallIntegerField()
    san = models.CharField(max_length=10)
    uci = models.CharField(max_length=10)
    from_square = models.CharField(max_length=2, blank=True, help_text="Case départ (ex. e2)")
    to_square = models.CharField(max_length=2, blank=True, help_text="Case arrivée (ex. e4)")
    fen_after = models.CharField(max_length=100)
    played_by_white = models.BooleanField()
    time_remaining_ms = models.PositiveIntegerField(null=True, blank=True)
    comment = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["move_number", "created_at"]

    def __str__(self):
        return f"{self.game_id}: {self.san}"


class GameAnalysis(models.Model):
    game = models.OneToOneField(Game, on_delete=models.CASCADE, related_name="analysis")
    accuracy_white = models.FloatField(null=True, blank=True)
    accuracy_black = models.FloatField(null=True, blank=True)
    blunders_white = models.PositiveSmallIntegerField(default=0)
    blunders_black = models.PositiveSmallIntegerField(default=0)
    best_moves_json = models.JSONField(default=list)
    evaluated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analysis: {self.game_id}"


class MatchmakingQueue(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    mode = models.CharField(max_length=20, choices=Game.Mode.choices)
    elo = models.PositiveIntegerField()
    is_timed = models.BooleanField(default=True)
    time_control_minutes = models.PositiveSmallIntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["mode", "elo"])]
