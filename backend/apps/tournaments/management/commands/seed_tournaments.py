from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from django.contrib.auth import get_user_model

from apps.tournaments.models import Tournament

User = get_user_model()


class Command(BaseCommand):
    help = "Crée des tournois de démo (Afrique + international) si absents."

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
                format="arena",
                mode="blitz",
                max_players=64,
                country="",
                starts_at=starts,
                is_african_cup=True,
                is_international_cup=False,
            ),
            dict(
                slug="rapid-sahel",
                name="Rapid du Sahel",
                description="Suisse rapide 10+5 pour joueurs confirmés.",
                format="swiss",
                mode="rapid",
                max_players=32,
                country="SN",
                starts_at=starts + timedelta(days=14),
                is_african_cup=True,
                is_international_cup=False,
            ),
            dict(
                slug="world-open-blitz",
                name="World Open Blitz",
                description="Arène blitz internationale — ouverte au monde entier.",
                format="arena",
                mode="blitz",
                max_players=128,
                country="",
                starts_at=starts + timedelta(days=3),
                is_african_cup=False,
                is_international_cup=True,
            ),
            dict(
                slug="global-swiss-masters",
                name="Global Swiss Masters",
                description="Suisse international rapide 15+10.",
                format="swiss",
                mode="rapid",
                max_players=64,
                country="",
                starts_at=starts + timedelta(days=10),
                is_african_cup=False,
                is_international_cup=True,
            ),
        ]
        created = 0
        for d in demos:
            obj, was_created = Tournament.objects.get_or_create(
                slug=d["slug"],
                defaults={
                    **d,
                    "created_by": owner,
                    "status": Tournament.Status.REGISTRATION,
                    "prize_pool": "—",
                },
            )
            if was_created:
                created += 1
            else:
                # Met à jour les drapeaux coupe si le seed existait déjà
                changed = False
                if obj.is_african_cup != d["is_african_cup"]:
                    obj.is_african_cup = d["is_african_cup"]
                    changed = True
                if obj.is_international_cup != d["is_international_cup"]:
                    obj.is_international_cup = d["is_international_cup"]
                    changed = True
                if changed:
                    obj.save(update_fields=["is_african_cup", "is_international_cup"])
        self.stdout.write(self.style.SUCCESS(f"{created} tournoi(s) de démo créé(s)."))
