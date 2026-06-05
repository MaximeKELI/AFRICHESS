from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from django.contrib.auth import get_user_model

from apps.tournaments.models import Tournament

User = get_user_model()


class Command(BaseCommand):
    help = "Crée des tournois de démo si la base est vide."

    def handle(self, *args, **options):
        owner = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if not owner:
            self.stderr.write("Créez un utilisateur avant seed_tournaments.")
            return
        starts = timezone.now() + timedelta(days=7)
        demos = [
            dict(
                slug="coupe-africhess-blitz",
                name="Coupe AFRICHESS Blitz",
                description="Arène blitz ouverte — 5 min + 2 s.",
                format="swiss",
                mode="blitz",
                max_players=64,
                country="",
                starts_at=starts,
            ),
            dict(
                slug="rapid-sahel",
                name="Rapid du Sahel",
                description="Rapide 10+5 pour joueurs confirmés.",
                format="arena",
                mode="rapid",
                max_players=32,
                country="SN",
                starts_at=starts + timedelta(days=14),
            ),
        ]
        created = 0
        for d in demos:
            _, was_created = Tournament.objects.get_or_create(
                slug=d["slug"],
                defaults={
                    **d,
                    "created_by": owner,
                    "status": Tournament.Status.REGISTRATION,
                    "is_african_cup": True,
                    "prize_pool": "—",
                },
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"{created} tournoi(s) de démo créé(s)."))
