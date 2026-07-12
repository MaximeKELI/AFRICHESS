"""Seed vidéos, coaches et streamers niveau 3."""

from django.core.management.base import BaseCommand

from apps.learning.models import Video
from apps.social.models import CoachProfile, StreamerProfile
from apps.users.models import User


VIDEOS = [
    ("Introduction aux échecs", "Introduction to chess", "https://www.youtube.com/watch?v=NAIQ3WHI7yY", "basics"),
    ("Tactiques : la fourchette", "Tactics: the fork", "https://www.youtube.com/watch?v=U4l8Yd5T7kY", "tactics"),
    ("Finale roi et pion", "King and pawn endgame", "https://www.youtube.com/watch?v=ZaidM8iYbMc", "endgame"),
    ("Ouverture italienne", "Italian opening", "https://www.youtube.com/watch?v=H_fLUiL8Q8s", "openings"),
    ("Attaque du roi", "King attack", "https://www.youtube.com/watch?v=O7YQd3Kq_cQ", "strategy"),
]

DEMO_COACHES = [
    {
        "username": "coach_amina",
        "display_name": "Amina Diallo",
        "bio": "Championne africaine — débutants et intermédiaires. Cours en français.",
        "fide_title": "WFM",
        "hourly_rate_eur": 25,
        "languages": "fr,en",
        "booking_url": "https://calendly.com/",
    },
    {
        "username": "coach_kwame",
        "display_name": "Kwame Mensah",
        "bio": "Entraîneur FIDE — tactiques et finales. English & Twi.",
        "fide_title": "FM",
        "hourly_rate_eur": 35,
        "languages": "en,fr",
        "booking_url": "https://calendly.com/",
    },
    {
        "username": "coach_sara",
        "display_name": "Sara Benali",
        "bio": "Préparation tournois et ouvertures modernes. Arabe & français.",
        "fide_title": "IM",
        "hourly_rate_eur": 45,
        "languages": "fr,ar,en",
        "booking_url": "https://calendly.com/",
    },
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

        for spec in DEMO_COACHES:
            user, created = User.objects.get_or_create(
                username=spec["username"],
                defaults={
                    "email": f"{spec['username']}@africhess.local",
                    "display_name": spec["display_name"],
                },
            )
            if created:
                user.set_password("coachdemo123")
                user.save()
            elif not user.display_name:
                user.display_name = spec["display_name"]
                user.save(update_fields=["display_name"])

            CoachProfile.objects.update_or_create(
                user=user,
                defaults={
                    "bio": spec["bio"],
                    "fide_title": spec["fide_title"],
                    "hourly_rate_eur": spec["hourly_rate_eur"],
                    "languages": spec["languages"],
                    "booking_url": spec["booking_url"],
                    "is_available": True,
                },
            )

        staff = User.objects.filter(is_staff=True).first()
        if staff:
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

        n_coaches = CoachProfile.objects.filter(is_available=True).count()
        self.stdout.write(self.style.SUCCESS(f"Level 3 seed OK — coaches available: {n_coaches}"))
