from django.conf import settings
from django.db import models


class Tournament(models.Model):
    class Format(models.TextChoices):
        SWISS = "swiss", "Swiss"
        KNOCKOUT = "knockout", "Knockout"
        ARENA = "arena", "Arena"

    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        REGISTRATION = "registration", "Registration Open"
        ACTIVE = "active", "In Progress"
        COMPLETED = "completed", "Completed"

    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    format = models.CharField(max_length=20, choices=Format.choices, default=Format.SWISS)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    mode = models.CharField(max_length=20, default="blitz")
    max_players = models.PositiveIntegerField(default=64)
    country = models.CharField(max_length=2, blank=True)
    is_african_cup = models.BooleanField(default=False)
    prize_pool = models.CharField(max_length=200, blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="tournaments", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class TournamentRound(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="rounds")
    round_number = models.PositiveSmallIntegerField()
    games = models.ManyToManyField("games.Game", blank=True)

    class Meta:
        unique_together = ["tournament", "round_number"]
