"""Seed vidéos niveau 3 (pas de coachs fictifs)."""

from django.core.management.base import BaseCommand

from apps.learning.models import Video


VIDEOS = [
    ("Introduction aux échecs", "Introduction to chess", "https://www.youtube.com/watch?v=NAIQ3WHI7yY", "basics"),
    ("Tactiques : la fourchette", "Tactics: the fork", "https://www.youtube.com/watch?v=U4l8Yd5T7kY", "tactics"),
    ("Finale roi et pion", "King and pawn endgame", "https://www.youtube.com/watch?v=ZaidM8iYbMc", "endgame"),
    ("Ouverture italienne", "Italian opening", "https://www.youtube.com/watch?v=H_fLUiL8Q8s", "openings"),
    ("Attaque du roi", "King attack", "https://www.youtube.com/watch?v=O7YQd3Kq_cQ", "strategy"),
]


class Command(BaseCommand):
    help = "Seed Level 3 videos only (no fictional coaches)"

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
        self.stdout.write(self.style.SUCCESS(f"Videos: {Video.objects.count()}"))
