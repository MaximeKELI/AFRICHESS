"""Seed vidéos, coaches et streamers niveau 3."""

from django.core.management.base import BaseCommand

from apps.learning.models import Video
from apps.social.models import CoachProfile, StreamerProfile
from apps.users.models import User


VIDEOS = [
    ("Introduction aux échecs", "Introduction to chess", "https://www.youtube.com/watch?v=NAIQ3WHI7yY", "basics"),
    ("Tactiques : le fourchette", "Tactics: the fork", "https://www.youtube.com/watch?v=U4l8Yd5T7kY", "tactics"),
    ("Finale roi et pion", "King and pawn endgame", "https://www.youtube.com/watch?v=ZaidM8iYbMc", "endgame"),
    ("Ouverture italienne", "Italian opening", "https://www.youtube.com/watch?v=H_fLUiL8Q8s", "openings"),
    ("Attaque du roi", "King attack", "https://www.youtube.com/watch?v=O7YQd3Kq_cQ", "strategy"),
]


class Command(BaseCommand):
    help = "Seed Level 3 content (videos, sample coaches/streamers)"

    def handle(self, *args, **options):
        for i, (title, title_en, url, cat) in enumerate(VIDEOS):
            Video.objects.get_or_create(
                title=title,
                defaults={
                    "title_en": title_en,
                    "url": url,
                    "category": cat,
                    "order": i,
                },
            )
        self.stdout.write(f"Videos: {Video.objects.count()}")

        staff = User.objects.filter(is_staff=True).first()
        if staff:
            CoachProfile.objects.get_or_create(
                user=staff,
                defaults={
                    "bio": "Coach certifié AFRICHESS — cours particuliers en français et anglais.",
                    "fide_title": "CM",
                    "hourly_rate_eur": 30,
                    "languages": "fr,en",
                    "booking_url": "https://calendly.com/",
                },
            )
            StreamerProfile.objects.get_or_create(
                user=staff,
                defaults={
                    "display_name": "AFRICHESS Live",
                    "twitch_username": "",
                    "youtube_channel_id": "",
                    "bio": "Parties en direct et analyses sur AFRICHESS.",
                    "is_featured": True,
                },
            )
        self.stdout.write(self.style.SUCCESS("Level 3 seed OK"))
