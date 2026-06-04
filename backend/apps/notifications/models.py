from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        GAME_INVITE = "game_invite", "Game Invite"
        FRIEND_REQUEST = "friend_request", "Friend Request"
        TOURNAMENT = "tournament", "Tournament"
        ACHIEVEMENT = "achievement", "Achievement"
        SYSTEM = "system", "System"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=30, choices=Type.choices)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    data = models.JSONField(default=dict)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
