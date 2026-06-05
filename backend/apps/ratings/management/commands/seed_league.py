"""Create active league season if missing."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.ratings.league_service import get_or_create_active_season


class Command(BaseCommand):
    help = "Ensure an active league season exists"

    def handle(self, *args, **options):
        season = get_or_create_active_season()
        self.stdout.write(
            self.style.SUCCESS(
                f"League season: {season.name} ({season.started_at.date()} → {season.ends_at.date()})"
            )
        )
