"""Streamers et marketplace coaches."""

from urllib.parse import urlparse

from django.conf import settings
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CoachProfile, StreamerProfile


def _twitch_parent() -> str:
    raw = getattr(settings, "FRONTEND_URL", "") or "http://localhost:3000"
    host = urlparse(raw).hostname
    return host or "localhost"


class StreamerListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = StreamerProfile.objects.select_related("user").filter(
            user__is_active=True
        ).order_by("-is_featured", "display_name")[:30]
        parent = _twitch_parent()
        data = []
        for s in qs:
            embed = None
            if s.twitch_username:
                embed = f"https://player.twitch.tv/?channel={s.twitch_username}&parent={parent}"
            elif s.youtube_channel_id:
                embed = f"https://www.youtube.com/embed/live_stream?channel={s.youtube_channel_id}"
            data.append({
                "username": s.user.username,
                "display_name": s.display_name or s.user.display_name or s.user.username,
                "bio": s.bio,
                "twitch": s.twitch_username,
                "youtube": s.youtube_channel_id,
                "embed_url": embed,
                "is_featured": s.is_featured,
            })
        return Response(data)


class CoachListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = CoachProfile.objects.select_related("user").filter(
            is_available=True, user__is_active=True
        )[:30]
        return Response([
            {
                "username": c.user.username,
                "display_name": c.user.display_name or c.user.username,
                "bio": c.bio,
                "fide_title": c.fide_title,
                "hourly_rate_eur": c.hourly_rate_eur,
                "languages": c.languages.split(",") if c.languages else [],
                "booking_url": c.booking_url,
            }
            for c in qs
        ])
