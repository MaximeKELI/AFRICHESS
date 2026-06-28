"""Seed 100 chess bots — légendes + personnages fictifs uniques."""

from django.core.management.base import BaseCommand

from apps.games.bot_catalog import BOT_CATALOG
from apps.games.models import ChessBot


class Command(BaseCommand):
    help = "Create or update 100 chess bots from bot_catalog (legends + fictional)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--deactivate-old",
            action="store_true",
            help="Deactivate bots whose slug is not in the catalog",
        )

    def handle(self, *args, **options):
        created = 0
        updated = 0
        catalog_slugs = set()

        for spec in BOT_CATALOG:
            catalog_slugs.add(spec["slug"])
            _, was_created = ChessBot.objects.update_or_create(
                slug=spec["slug"],
                defaults={
                    "name": spec["name"],
                    "name_en": spec["name_en"],
                    "country": spec["country"],
                    "elo": spec["elo"],
                    "avatar_id": spec["avatar_id"],
                    "personality": spec["personality"],
                    "opening_style": spec["opening_style"],
                    "description": spec["description"],
                    "description_en": spec["description_en"],
                    "is_premium": spec["is_premium"],
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        deactivated = 0
        if options["deactivate_old"]:
            deactivated = ChessBot.objects.exclude(slug__in=catalog_slugs).update(is_active=False)

        total = ChessBot.objects.filter(is_active=True).count()
        legends = sum(1 for s in BOT_CATALOG if s["is_legend"])
        self.stdout.write(
            self.style.SUCCESS(
                f"Bots: {created} new, {updated} updated, {legends} legends, "
                f"{deactivated} deactivated, {total} active total."
            )
        )
