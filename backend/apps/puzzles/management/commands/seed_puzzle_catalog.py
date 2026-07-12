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


def _upsert_seed(data: dict) -> str:
    """Crée ou met à jour un puzzle seed (corrige les anciennes solutions invalides)."""
    existing = Puzzle.objects.filter(fen=data["fen"], source="seed").first()
    if existing:
        changed = False
        for key in ("solution_moves", "themes", "difficulty", "rating"):
            if getattr(existing, key) != data[key]:
                setattr(existing, key, data[key])
                changed = True
        if changed:
            existing.save()
            return "updated"
        return "unchanged"
    Puzzle.objects.create(**data, source="seed")
    return "created"


class Command(BaseCommand):
    help = "Seed tactical puzzle catalogue (positions légales, complété par Lichess via seed_puzzles)"

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

        created = updated = skipped = 0
        valid_fens: set[str] = set()
        for data in PUZZLE_CATALOG:
            if not _validate_puzzle(data):
                skipped += 1
                continue
            valid_fens.add(data["fen"])
            result = _upsert_seed(data)
            if result == "created":
                created += 1
            elif result == "updated":
                updated += 1

        # Purge seed hors catalogue ou encore invalides
        purged = 0
        for puzzle in Puzzle.objects.filter(source="seed"):
            payload = {
                "fen": puzzle.fen,
                "solution_moves": puzzle.solution_moves,
            }
            if puzzle.fen not in valid_fens or not _validate_puzzle(payload):
                puzzle.delete()
                purged += 1

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
        candidates = list(Puzzle.objects.filter(source="seed").order_by("rating")[:30])
        for i, day_offset in enumerate(range(1, 8)):
            if i >= len(candidates):
                break
            p = candidates[i]
            p.daily_date = today + timedelta(days=day_offset)
            p.save(update_fields=["daily_date"])

        total = Puzzle.objects.filter(source="seed").count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Catalogue : +{created} créés, {updated} mis à jour, {skipped} invalides ignorés, "
                f"{purged} purgés, {total} puzzles seed en base, {len(PUZZLE_THEMES)} thèmes"
            )
        )
