import uuid

from django.conf import settings
from django.db import models


class ChessBot(models.Model):
    """Adversaire IA nommé (catalogue type Chess.com)."""

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=2, default="SN")
    elo = models.PositiveIntegerField()
    avatar_id = models.CharField(max_length=20, default="avatar-1")
    personality = models.CharField(max_length=50, blank=True)
    opening_style = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    is_premium = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    games_played = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["elo", "name"]

    def __str__(self):
        return f"{self.name} ({self.elo})"


class Game(models.Model):
    class Variant(models.TextChoices):
        STANDARD = "standard", "Standard"
        CHESS960 = "chess960", "Chess960"
        CRAZYHOUSE = "crazyhouse", "Crazyhouse"
        KING_OF_THE_HILL = "kingofthehill", "King of the Hill"
        THREE_CHECK = "threecheck", "Three-check"
        ATOMIC = "atomic", "Atomic"

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
        CORRESPONDENCE = "correspondence", "Correspondence (daily)"
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
    variant = models.CharField(
        max_length=20,
        choices=Variant.choices,
        default=Variant.STANDARD,
    )
    chess960_position_id = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Position Chess960 (0–959)",
    )
    bot = models.ForeignKey(
        ChessBot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="games",
    )
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
    takeback_requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="takeback_requests_made",
    )
    conditional_moves = models.JSONField(default=list, blank=True)
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
    stats_recorded = models.BooleanField(
        default=False,
        help_text="True une fois les UserStats mises à jour pour cette partie",
    )
    days_per_move = models.PositiveSmallIntegerField(
        default=3,
        help_text="Jours par coup (parties correspondance)",
    )
    turn_deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date limite pour jouer le coup en cours",
    )
    is_rated = models.BooleanField(
        default=True,
        help_text="False = partie amicale sans impact Elo",
    )
    is_vote_chess = models.BooleanField(default=False)
    odds_preset = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "mode"]),
            models.Index(fields=["white_player", "black_player"]),
            models.Index(fields=["tournament", "status"]),
            models.Index(fields=["status", "-ended_at"]),
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
    think_ms = models.PositiveIntegerField(null=True, blank=True, help_text="Temps de réflexion du joueur")
    complexity_cp = models.PositiveSmallIntegerField(null=True, blank=True)
    comment = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["move_number", "created_at"]
        indexes = [models.Index(fields=["game", "move_number"])]

    def __str__(self):
        return f"{self.game_id}: {self.san}"


class GameAnalysis(models.Model):
    game = models.OneToOneField(Game, on_delete=models.CASCADE, related_name="analysis")
    accuracy_white = models.FloatField(null=True, blank=True)
    accuracy_black = models.FloatField(null=True, blank=True)
    blunders_white = models.PositiveSmallIntegerField(default=0)
    blunders_black = models.PositiveSmallIntegerField(default=0)
    best_moves_json = models.JSONField(default=list)
    summary_fr = models.TextField(blank=True)
    key_moments_json = models.JSONField(default=list)
    evaluated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analysis: {self.game_id}"


class AnalysisJob(models.Model):
    """Analyse cloud asynchrone (Celery)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="analysis_jobs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    depth = models.PositiveSmallIntegerField(default=18)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class MatchmakingQueue(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    mode = models.CharField(max_length=20, choices=Game.Mode.choices)
    elo = models.PositiveIntegerField()
    is_timed = models.BooleanField(default=True)
    is_rated = models.BooleanField(default=True)
    time_control_minutes = models.PositiveSmallIntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["mode", "elo", "is_rated"])]


class CorrespondenceQueue(models.Model):
    """File d'attente pour parties daily chess (pool ouvert)."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    days_per_move = models.PositiveSmallIntegerField(default=3)
    elo = models.PositiveIntegerField(default=1200)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["days_per_move", "elo"])]


class SimulSession(models.Model):
    """Simultanée : un hôte contre plusieurs adversaires."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"

    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="simuls_hosted",
    )
    title = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    max_boards = models.PositiveSmallIntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Simul {self.id} — {self.host_id}"


class SimulBoard(models.Model):
    session = models.ForeignKey(SimulSession, on_delete=models.CASCADE, related_name="boards")
    game = models.OneToOneField(Game, on_delete=models.CASCADE, related_name="simul_board")
    opponent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="simul_games",
    )
    board_number = models.PositiveSmallIntegerField(default=1)

    class Meta:
        unique_together = ["session", "opponent"]


class VoteGame(models.Model):
    """Métadonnées vote chess — clubs votent collectivement."""

    game = models.OneToOneField(Game, on_delete=models.CASCADE, related_name="vote_meta")
    club_white = models.ForeignKey(
        "social.Club",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="vote_games_white",
    )
    club_black = models.ForeignKey(
        "social.Club",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="vote_games_black",
    )
    voting_ply = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"VoteGame {self.game_id}"


class GameVote(models.Model):
    """Vote d'un membre pour le prochain coup."""

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    move_uci = models.CharField(max_length=10)
    ply = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["game", "user", "ply"]


class GameFairPlayTelemetry(models.Model):
    """Télémétrie client accumulée par joueur et par partie."""

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="fairplay_telemetry")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["game", "user"]
        indexes = [models.Index(fields=["game", "user"])]


class FairPlayReport(models.Model):
    """Rapport anti-triche post-partie (moteur C++)."""

    class Verdict(models.TextChoices):
        CLEAN = "clean", "Clean"
        REVIEW = "review", "Review"
        SUSPICIOUS = "suspicious", "Suspicious"
        LIKELY_CHEAT = "likely_cheat", "Likely cheat"
        ENGINE_UNAVAILABLE = "engine_unavailable", "Engine unavailable"

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="fairplay_reports")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="fairplay_reports",
    )
    overall_score = models.FloatField(default=0.0)
    verdict = models.CharField(max_length=20, choices=Verdict.choices, default=Verdict.CLEAN)
    signals_json = models.JSONField(default=list, blank=True)
    move_evals_json = models.JSONField(default=list, blank=True)
    engine_top1_rate = models.FloatField(default=0.0)
    engine_top3_rate = models.FloatField(default=0.0)
    avg_centipawn_loss = models.FloatField(default=0.0)
    accuracy_estimate = models.FloatField(default=0.0)
    analyzed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["game", "user"]
        indexes = [models.Index(fields=["verdict", "-overall_score"])]


class FairPlayReviewCase(models.Model):
    """File de revue humaine — aucune sanction automatique."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_REVIEW = "in_review", "In review"
        DISMISSED = "dismissed", "Dismissed"
        CONFIRMED = "confirmed", "Confirmed"
        ESCALATED = "escalated", "Escalated"

    class Decision(models.TextChoices):
        NONE = "none", "None"
        WARN = "warn", "Warning"
        MATCHMAKING_BLOCK = "matchmaking_block", "Matchmaking block"
        SUSPEND_TEMP = "suspend_temp", "Temporary suspension"
        SUSPEND_PERM = "suspend_perm", "Permanent suspension"

    report = models.OneToOneField(FairPlayReport, on_delete=models.CASCADE, related_name="review_case")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fairplay_reviews",
    )
    notes = models.TextField(blank=True)
    decision = models.CharField(max_length=30, choices=Decision.choices, default=Decision.NONE)
    peer_score_delta = models.FloatField(
        default=0.0,
        help_text="Écart de score Fair Play vs adversaire dans la même partie",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["-peer_score_delta"]),
        ]


class FairPlaySanction(models.Model):
    """Sanction appliquée uniquement après décision staff."""

    class SanctionType(models.TextChoices):
        WARN = "warn", "Warning"
        MATCHMAKING_BLOCK = "matchmaking_block", "Matchmaking block"
        SUSPEND_TEMP = "suspend_temp", "Temporary suspension"
        SUSPEND_PERM = "suspend_perm", "Permanent suspension"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fairplay_sanctions")
    review_case = models.ForeignKey(
        FairPlayReviewCase,
        on_delete=models.CASCADE,
        related_name="sanctions",
    )
    sanction_type = models.CharField(max_length=30, choices=SanctionType.choices)
    until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="fairplay_sanctions_issued",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_active", "-created_at"])]


class FairPlayUserConsent(models.Model):
    """Consentement RGPD pour la collecte Fair Play (télémétrie comportementale)."""

    CONSENT_VERSION = "1.0"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="fairplay_consent",
    )
    consent_version = models.CharField(max_length=16, default=CONSENT_VERSION)
    consented_at = models.DateTimeField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default="")

    class Meta:
        indexes = [models.Index(fields=["-consented_at"])]


class FairPlayAppeal(models.Model):
    """Recours joueur — droit de réponse (FIDE Fair Play / Lichess)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        UNDER_REVIEW = "under_review", "Under review"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="fairplay_appeals",
    )
    review_case = models.ForeignKey(
        FairPlayReviewCase,
        on_delete=models.CASCADE,
        related_name="appeals",
    )
    reason = models.TextField(max_length=4000)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    staff_response = models.TextField(blank=True, default="")
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "-created_at"])]


class FairPlayAuditLog(models.Model):
    """Journal d'audit staff immuable (ISO 27001 / FIDE evidence chain)."""

    class Action(models.TextChoices):
        VIEW_OVERVIEW = "view_overview", "View overview"
        VIEW_QUEUE = "view_queue", "View queue"
        VIEW_GAME = "view_game", "View game"
        VIEW_USER = "view_user", "View user"
        DECIDE_CASE = "decide_case", "Decide case"
        ENGINE_FAILURE = "engine_failure", "Engine failure"
        SANCTION_EXPIRED = "sanction_expired", "Sanction expired"
        APPEAL_RESOLVED = "appeal_resolved", "Appeal resolved"

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fairplay_audit_logs",
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    target_type = models.CharField(max_length=32, blank=True, default="")
    target_id = models.CharField(max_length=64, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["target_type", "target_id"]),
        ]
