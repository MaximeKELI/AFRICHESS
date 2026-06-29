from django.conf import settings
from django.db import models


class Friendship(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        BLOCKED = "blocked", "Blocked"

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="friendships_sent"
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="friendships_received"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["from_user", "to_user"]


class UserFollow(models.Model):
    """Abonnement à un joueur (style « Follow » Chess.com)."""

    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="following"
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="followers"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["follower", "following"]
        indexes = [
            models.Index(fields=["follower", "-created_at"]),
            models.Index(fields=["following", "-created_at"]),
        ]


class Club(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    country = models.CharField(max_length=2, blank=True)
    logo = models.ImageField(upload_to="clubs/", blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="clubs", blank=True)
    is_public = models.BooleanField(default=True)
    member_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ForumPost(models.Model):
    class Category(models.TextChoices):
        GENERAL = "general", "General"
        AFRICA = "africa", "Africa"
        NEWS = "news", "News"
        STRATEGY = "strategy", "Strategy"
        BLOG = "blog", "Blog"

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="forum_posts",
    )
    title = models.CharField(max_length=200)
    body = models.TextField()
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.GENERAL,
    )
    club = models.ForeignKey(
        Club,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="forum_posts",
    )
    is_featured = models.BooleanField(default=False)
    likes_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ClubEvent(models.Model):
    """Événement de club (tournoi, annonce, défi)."""

    class EventType(models.TextChoices):
        ANNOUNCEMENT = "announcement", "Announcement"
        TOURNAMENT = "tournament", "Tournament"
        CHALLENGE = "challenge", "Challenge"

    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="events")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="club_events_created",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=20, choices=EventType.choices, default=EventType.ANNOUNCEMENT)
    starts_at = models.DateTimeField()
    tournament = models.ForeignKey(
        "tournaments.Tournament",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="club_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at"]

    def __str__(self):
        return self.title


class ForumComment(models.Model):
    post = models.ForeignKey(ForumPost, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="forum_comments",
    )
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment on {self.post_id} by {self.author_id}"


class ForumPostLike(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="forum_likes",
    )
    post = models.ForeignKey(ForumPost, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "post"]


class StreamerProfile(models.Model):
    """Profil streamer (Twitch / YouTube)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="streamer_profile"
    )
    twitch_username = models.CharField(max_length=80, blank=True)
    youtube_channel_id = models.CharField(max_length=80, blank=True)
    display_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name or self.user.username


class CoachProfile(models.Model):
    """Coach humain — marketplace (sans Stripe Connect pour l'instant)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="coach_profile"
    )
    bio = models.TextField(blank=True)
    fide_title = models.CharField(max_length=10, blank=True)
    hourly_rate_eur = models.PositiveIntegerField(default=25)
    languages = models.CharField(max_length=120, default="fr,en")
    timezone = models.CharField(max_length=40, default="UTC")
    is_available = models.BooleanField(default=True)
    booking_url = models.URLField(blank=True, help_text="Calendly ou lien externe")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Coach {self.user.username}"


class ChatMessage(models.Model):
    class RoomType(models.TextChoices):
        GAME = "game", "Game"
        DIRECT = "direct", "Direct"
        CLUB = "club", "Club"

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    room_type = models.CharField(max_length=10, choices=RoomType.choices)
    room_id = models.CharField(max_length=100)
    content = models.TextField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["room_type", "room_id", "-created_at"])]


class PlayerReport(models.Model):
    class Category(models.TextChoices):
        HARASSMENT = "harassment", "Harassment"
        CHEATING = "cheating", "Cheating"
        SPAM = "spam", "Spam"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REVIEWED = "reviewed", "Reviewed"
        DISMISSED = "dismissed", "Dismissed"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_filed"
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_received"
    )
    game = models.ForeignKey(
        "games.Game", on_delete=models.SET_NULL, null=True, blank=True, related_name="player_reports"
    )
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.TextField(max_length=2000, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class PlatformEvent(models.Model):
    class EventType(models.TextChoices):
        TOURNAMENT = "tournament", "Tournament"
        ARENA = "arena", "Arena"
        COMMUNITY = "community", "Community"
        LESSON = "lesson", "Lesson"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_type = models.CharField(max_length=20, choices=EventType.choices, default=EventType.TOURNAMENT)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    url_path = models.CharField(max_length=300, blank=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at"]
