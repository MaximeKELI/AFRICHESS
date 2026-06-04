from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from django.contrib.auth import get_user_model

from apps.tournaments.models import Tournament

User = get_user_model()


class Command(BaseCommand):
    help = "Crée des tournois de démo si la base est vide."

    def handle(self, *args, **options):
        if Tournament.objects.exists():
            self.stdout.write("Tournois déjà présents — rien à faire.")
            return
        owner = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if not owner:
            self.stderr.write("Créez un utilisateur avant seed_tournaments.")
            return
        starts = timezone.now() + timedelta(days=7)
        Tournament.objects.create(
            created_by=owner,
            name="Coupe AFRICHESS Blitz",
            slug="coupe-africhess-blitz",
            description="Arène blitz ouverte — 5 min + 2 s.",
            format="swiss",
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            max_players=64,
            country="",
            is_african_cup=True,
            prize_pool="Badges & titre régional",
            starts_at=starts,
        )
        Tournament.objects.create(
            created_by=owner,
            name="Rapid du Sahel",
            slug="rapid-sahel",
            description="Rapide 10+5 pour joueurs confirmés.",
            format="arena",
            status=Tournament.Status.REGISTRATION,
            mode="rapid",
            max_players=32,
            country="SN",
            is_african_cup=True,
            prize_pool="—",
            starts_at=starts + timedelta(days=14),
        )
        self.stdout.write(self.style.SUCCESS("2 tournois de démo créés."))
