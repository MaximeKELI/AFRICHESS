"""Seed 100 named chess bots for the bot catalog."""

from django.core.management.base import BaseCommand

from apps.games.models import ChessBot

FIRST_NAMES = [
    "Kwame", "Amara", "Zara", "Moussa", "Nia", "Kofi", "Amina", "Fatou", "Ibrahim", "Aisha",
    "Omar", "Lerato", "Thabo", "Zinhle", "Sipho", "Naledi", "Jabari", "Zola", "Kendi", "Ayana",
    "Malik", "Nuru", "Sefu", "Adama", "Binta", "Cheikh", "Diarra", "Esi", "Femi", "Gugu",
    "Hassan", "Imani", "Jengo", "Kesi", "Lamine", "Makena", "Ngozi", "Olu", "Pendo", "Rashid",
    "Sanaa", "Tendai", "Umi", "Wanjiru", "Xolani", "Yaa", "Zuberi", "Abeni", "Chidi", "Dalia",
]

LAST_NAMES = [
    "Diallo", "Mensah", "Okafor", "Keita", "Nkosi", "Traoré", "Adeyemi", "Kamau", "Sow", "Banda",
    "Mbeki", "Touré", "Okonkwo", "Mwangi", "Bah", "Ndlovu", "Sankara", "Eze", "Diop", "Moyo",
    "Sissoko", "Osei", "Kone", "Mabaso", "Fofana", "Chukwu", "Dlamini", "Coulibaly", "Achebe", "Zuma",
]

PERSONALITIES = ["aggressive", "positional", "tactical", "solid", "creative", "endgame"]
OPENINGS = [
    "Sicilienne", "Partie ouverte", "Caro-Kann", "Dame indienne", "Réti", "Anglaise",
    "Gambit de la dame", "Scandinave", "Alekhine", "Pirc", "Nimzo-indienne",
]
AVATARS = [f"avatar-{i}" for i in range(1, 9)]
COUNTRIES = ["SN", "NG", "KE", "GH", "CI", "ZA", "EG", "MA", "CM", "TZ", "ET", "RW", "UG", "ML", "BF"]


class Command(BaseCommand):
    help = "Create 100 chess bots with African names and varied ELO"

    def handle(self, *args, **options):
        created = 0
        for i in range(100):
            elo = 200 + i * 48
            if elo > 5000:
                elo = 5000
            first = FIRST_NAMES[i % len(FIRST_NAMES)]
            last = LAST_NAMES[(i * 3) % len(LAST_NAMES)]
            name = f"{first} {last}"
            slug = f"bot-{i + 1:03d}"
            personality = PERSONALITIES[i % len(PERSONALITIES)]
            opening = OPENINGS[i % len(OPENINGS)]
            is_premium = elo >= 2400
            _, was_created = ChessBot.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "name_en": name,
                    "country": COUNTRIES[i % len(COUNTRIES)],
                    "elo": elo,
                    "avatar_id": AVATARS[i % len(AVATARS)],
                    "personality": personality,
                    "opening_style": opening,
                    "description": (
                        f"{name} joue un style {personality} avec la {opening}. "
                        f"ELO estimé : {elo}."
                    ),
                    "description_en": (
                        f"{name} plays a {personality} style with the {opening}. "
                        f"Estimated ELO: {elo}."
                    ),
                    "is_premium": is_premium,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
        total = ChessBot.objects.count()
        self.stdout.write(self.style.SUCCESS(f"Bots: {created} new, {total} total."))
