from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.social.models import ForumPost

POSTS = [
    {
        "title": "Les échecs au Sénégal",
        "body": "Dakar et Saint-Louis accueillent des tournois ouverts qui réunissent joueurs locaux et visiteurs. Le jeu se transmet dans les écoles et les clubs de quartier.",
        "category": "africa",
        "featured": True,
    },
    {
        "title": "Nigeria, puissance montante",
        "body": "Avec une jeune génération de grands maîtres et d'IM, le Nigeria forme l'élite du continent et inspire toute l'Afrique de l'Ouest.",
        "category": "africa",
        "featured": True,
    },
    {
        "title": "Éthiopie & Kenya",
        "body": "Les championnats d'Afrique de l'Est développent des talents en blitz et en rapide, souvent sur mobile.",
        "category": "africa",
        "featured": True,
    },
    {
        "title": "Bienvenue sur AFRICHESS",
        "body": "Notre plateforme relie les joueurs du continent : classements par pays, clubs, tournois et parties daily chess. Partagez vos parties et progressez ensemble !",
        "category": "news",
        "featured": True,
    },
    {
        "title": "Comment améliorer en tactique ?",
        "body": "Résolvez le puzzle du jour, jouez en rush 3 minutes, puis analysez vos parties avec Game Review. La régularité bat le talent brut.",
        "category": "strategy",
        "featured": False,
    },
]


class Command(BaseCommand):
    help = "Seed forum posts for community feed"

    def handle(self, *args, **options):
        User = get_user_model()
        author = User.objects.filter(is_staff=True).first() or User.objects.first()
        if not author:
            self.stderr.write("No users.")
            return
        n = 0
        for p in POSTS:
            _, created = ForumPost.objects.get_or_create(
                title=p["title"],
                defaults={
                    "body": p["body"],
                    "category": p["category"],
                    "is_featured": p["featured"],
                    "author": author,
                },
            )
            if created:
                n += 1
        self.stdout.write(self.style.SUCCESS(f"Forum: {n} new posts."))
