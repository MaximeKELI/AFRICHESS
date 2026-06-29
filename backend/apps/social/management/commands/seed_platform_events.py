from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.social.models import PlatformEvent


class Command(BaseCommand):
    help = "Seed calendrier événements plateforme"

    def handle(self, *args, **options):
        now = timezone.now()
        samples = [
            (
                "Arène Blitz du weekend",
                "Tournoi arène ouvert à tous — 3+2",
                PlatformEvent.EventType.ARENA,
                "/tournaments",
            ),
            (
                "Daily Chess Challenge",
                "Partie correspondance 3 jours/coup",
                PlatformEvent.EventType.TOURNAMENT,
                "/play/daily",
            ),
            (
                "Puzzle Rush Community",
                "Battez votre record en mode Rush",
                PlatformEvent.EventType.COMMUNITY,
                "/puzzles",
            ),
        ]
        created = 0
        for i, (title, desc, etype, path) in enumerate(samples):
            _, was_created = PlatformEvent.objects.get_or_create(
                title=title,
                defaults={
                    "description": desc,
                    "event_type": etype,
                    "starts_at": now + timezone.timedelta(days=i),
                    "url_path": path,
                    "is_featured": i == 0,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"{created} événement(s) créé(s)"))
