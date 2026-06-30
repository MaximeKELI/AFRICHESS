"""Sélection du puzzle du jour (source unique)."""

from django.utils import timezone

from .models import Puzzle


def get_daily_puzzle() -> Puzzle | None:
    today = timezone.now().date()
    puzzle = Puzzle.objects.filter(is_daily=True, daily_date=today).first()
    if not puzzle:
        puzzle = Puzzle.objects.filter(is_daily=True).order_by("-daily_date").first()
    if not puzzle:
        puzzle = Puzzle.objects.first()
    return puzzle
