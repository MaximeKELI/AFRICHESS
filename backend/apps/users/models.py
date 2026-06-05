from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """Extended user model with African chess identity."""

    class Language(models.TextChoices):
        EN = "en", "English"
        FR = "fr", "French"
        AR = "ar", "Arabic"
        PT = "pt", "Portuguese"
        SW = "sw", "Swahili"

    class ChessLevel(models.TextChoices):
        BEGINNER = "beginner", "Débutant"
        INTERMEDIATE = "intermediate", "Intermédiaire"
        ADVANCED = "advanced", "Avancé"
        EXPERT = "expert", "Expert"
        MASTER = "master", "Maître"

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        UNDISCLOSED = "undisclosed", "Prefer not to say"

    class DiscoverySource(models.TextChoices):
        FRIEND = "friend", "Friend"
        SOCIAL = "social", "Social media"
        SEARCH = "search", "Search engine"
        TOURNAMENT = "tournament", "Tournament / club"
        SCHOOL = "school", "School"
        PRESS = "press", "Press / media"
        OTHER = "other", "Other"

    LEVEL_ELO = {
        "beginner": 800,
        "intermediate": 1200,
        "advanced": 1600,
        "expert": 2000,
        "master": 2200,
    }

    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    avatar_preset = models.CharField(
        max_length=20,
        blank=True,
        default="avatar-1",
        help_text="Preset avatar id (avatar-1 … avatar-8)",
    )
    chess_level = models.CharField(
        max_length=20,
        choices=ChessLevel.choices,
        default=ChessLevel.INTERMEDIATE,
    )
    bio = models.TextField(max_length=500, blank=True)
    country = models.CharField(max_length=2, default="SN")
    city = models.CharField(max_length=100, blank=True)
    birth_year = models.PositiveSmallIntegerField(null=True, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        blank=True,
        default="",
    )
    discovery_source = models.CharField(
        max_length=20,
        choices=DiscoverySource.choices,
        blank=True,
        default="",
    )
    registration_locale = models.CharField(max_length=5, blank=True, default="")
    preferred_language = models.CharField(
        max_length=5, choices=Language.choices, default=Language.EN
    )
    is_african_highlight = models.BooleanField(
        default=False,
        help_text="Featured African chess player on homepage",
    )
    low_bandwidth_mode = models.BooleanField(default=False)
    title = models.CharField(max_length=20, blank=True)  # GM, IM, FM, etc.
    fide_id = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def display_name(self):
        return self.get_full_name() or self.username

    @property
    def initial_elo(self):
        return self.LEVEL_ELO.get(self.chess_level, 1200)

    def __str__(self):
        return self.username


class UserStats(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="stats")
    games_played = models.PositiveIntegerField(default=0)
    games_won = models.PositiveIntegerField(default=0)
    games_drawn = models.PositiveIntegerField(default=0)
    games_lost = models.PositiveIntegerField(default=0)
    puzzles_solved = models.PositiveIntegerField(default=0)
    best_win_streak = models.PositiveIntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    total_play_time_seconds = models.PositiveBigIntegerField(default=0)
    daily_puzzle_streak = models.PositiveIntegerField(default=0)
    daily_puzzle_last_date = models.DateField(null=True, blank=True)

    @property
    def win_rate(self):
        if self.games_played == 0:
            return 0.0
        return round((self.games_won / self.games_played) * 100, 1)

    def __str__(self):
        return f"Stats: {self.user.username}"
