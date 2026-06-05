from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.social.models import Club

CLUBS = [
    {
        "name": "Club Échecs Dakar",
        "description": "Communauté sénégalaise — tournois blitz et entraînement hebdomadaire.",
        "country": "SN",
    },
    {
        "name": "Lagos Chess Academy",
        "description": "Joueurs nigérians de tous niveaux. Puzzles tactiques et parties rapides.",
        "country": "NG",
    },
    {
        "name": "AFRICHESS Global",
        "description": "Club mondial ouvert à tous les passionnés des échecs africains et internationaux.",
        "country": "",
    },
]


class Command(BaseCommand):
    help = "Seed sample public chess clubs"

    def handle(self, *args, **options):
        User = get_user_model()
        owner = User.objects.filter(is_staff=True).first() or User.objects.first()
        if not owner:
            self.stderr.write("No users found — create a user first.")
            return
        created = 0
        for data in CLUBS:
            slug = slugify(data["name"])
            club, was_created = Club.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": data["name"],
                    "description": data["description"],
                    "country": data["country"],
                    "owner": owner,
                    "is_public": True,
                    "member_count": 1,
                },
            )
            if was_created:
                club.members.add(owner)
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Clubs ready ({created} new)."))
