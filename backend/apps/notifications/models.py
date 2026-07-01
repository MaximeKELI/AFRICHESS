from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        GAME_INVITE = "game_invite", "Game Invite"
        MATCH_FOUND = "match_found", "Match Found"
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
        indexes = [
            models.Index(fields=["user", "is_read", "-created_at"]),
        ]


class DeviceToken(models.Model):
    """Token push natif — Expo (APNs/FCM) ou Web Push (VAPID)."""

    class Platform(models.TextChoices):
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"
        WEB = "web", "Web"

    class Kind(models.TextChoices):
        EXPO = "expo", "Expo Push"
        WEBPUSH = "webpush", "Web Push"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="device_tokens"
    )
    token = models.TextField()
    platform = models.CharField(max_length=16, choices=Platform.choices)
    kind = models.CharField(max_length=16, choices=Kind.choices)
    subscription_json = models.JSONField(default=dict, blank=True)
    device_id = models.CharField(max_length=128, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["user", "token"], name="notifications_unique_user_token"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} {self.kind} {self.platform}"
