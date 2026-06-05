from django.conf import settings
from django.db import models


class UserActivityEvent(models.Model):
    """Événement d'activité utilisateur (page, clic, action serveur)."""

    class EventType(models.TextChoices):
        PAGE_VIEW = "page_view", "Page view"
        CLICK = "click", "Click"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        REGISTER = "register", "Register"
        GAME_START = "game_start", "Game start"
        GAME_END = "game_end", "Game end"
        PUZZLE_ATTEMPT = "puzzle_attempt", "Puzzle attempt"
        LESSON_COMPLETE = "lesson_complete", "Lesson complete"
        TOURNAMENT_JOIN = "tournament_join", "Tournament join"
        FRIEND_REQUEST = "friend_request", "Friend request"
        CHAT_MESSAGE = "chat_message", "Chat message"
        PROFILE_UPDATE = "profile_update", "Profile update"
        SEARCH = "search", "Search"
        OTHER = "other", "Other"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_events",
    )
    session_id = models.CharField(max_length=64, db_index=True, blank=True, default="")
    event_type = models.CharField(max_length=32, choices=EventType.choices, db_index=True)
    path = models.CharField(max_length=512, blank=True, default="")
    element = models.CharField(max_length=256, blank=True, default="")
    label = models.CharField(max_length=256, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    ip_hash = models.CharField(max_length=64, blank=True, default="")
    user_agent = models.CharField(max_length=512, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["event_type", "-created_at"]),
            models.Index(fields=["session_id", "-created_at"]),
        ]

    def __str__(self):
        who = self.user.username if self.user_id else self.session_id[:8]
        return f"{self.event_type} — {who} @ {self.created_at:%Y-%m-%d %H:%M}"
