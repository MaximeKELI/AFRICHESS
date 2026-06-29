"""Seed puzzle catalogue — positions validées par python-chess."""

from datetime import timedelta

import chess
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.puzzles.models import Puzzle
from apps.puzzles.puzzle_catalog import PUZZLE_CATALOG, PUZZLE_THEMES


def _validate_puzzle(data: dict) -> bool:
    try:
        board = chess.Board(data["fen"])
        for uci in data["solution_moves"]:
            move = chess.Move.from_uci(uci)
            if move not in board.legal_moves:
                return False
            board.push(move)
        return True
    except Exception:
        return False


class Command(BaseCommand):
    help = "Seed tactical puzzle catalogue (80+ puzzles)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear-seed",
            action="store_true",
            help="Supprime les puzzles seed existants avant réinsertion",
        )

    def handle(self, *args, **options):
        if options["clear_seed"]:
            deleted, _ = Puzzle.objects.filter(source="seed").delete()
            self.stdout.write(f"Supprimé {deleted} puzzles seed")

        valid = 0
        skipped = 0
        for data in PUZZLE_CATALOG:
            if not _validate_puzzle(data):
                skipped += 1
                continue
            _, created = Puzzle.objects.get_or_create(
                fen=data["fen"],
                defaults={
                    **data,
                    "source": "seed",
                },
            )
            if created:
                valid += 1

        # Puzzle du jour : un puzzle medium aléatoire stable par date
        today = timezone.now().date()
        daily = (
            Puzzle.objects.filter(source="seed", difficulty="medium")
            .order_by("rating", "id")
            .first()
        )
        if daily:
            Puzzle.objects.filter(is_daily=True).update(is_daily=False, daily_date=None)
            daily.is_daily = True
            daily.daily_date = today
            daily.save(update_fields=["is_daily", "daily_date"])

        # Pré-assigner des daily pour les 7 prochains jours (rotation)
        candidates = list(
            Puzzle.objects.filter(source="seed").order_by("rating")[:30]
        )
        for i, day_offset in enumerate(range(1, 8)):
            if i >= len(candidates):
                break
            p = candidates[i]
            p.daily_date = today + timedelta(days=day_offset)
            p.save(update_fields=["daily_date"])

        total = Puzzle.objects.filter(source="seed").count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Catalogue : +{valid} nouveaux, {skipped} invalides ignorés, "
                f"{total} puzzles seed en base, {len(PUZZLE_THEMES)} thèmes"
            )
        )
