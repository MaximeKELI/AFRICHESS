"""Importe des puzzles depuis la base ouverte Lichess (CC0, ~4M puzzles)."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.puzzles.lichess_import import (
    DEFAULT_CACHE,
    MIN_PUZZLE_POOL,
    RATING_TARGETS,
    download_lichess_db,
    iter_valid_puzzles,
)
from apps.puzzles.models import Puzzle


class Command(BaseCommand):
    help = f"Import Lichess puzzles ({MIN_PUZZLE_POOL}+ par défaut, validés python-chess)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=MIN_PUZZLE_POOL,
            help=f"Nombre max de puzzles à importer (défaut: {MIN_PUZZLE_POOL})",
        )
        parser.add_argument(
            "--min-rating",
            type=int,
            default=600,
        )
        parser.add_argument(
            "--max-rating",
            type=int,
            default=2400,
        )
        parser.add_argument(
            "--min-popularity",
            type=int,
            default=75,
            help="Popularité Lichess min (-100 à 100, défaut 75)",
        )
        parser.add_argument(
            "--file",
            type=str,
            default="",
            help="Chemin vers lichess_db_puzzle.csv.zst (sinon cache data/)",
        )
        parser.add_argument(
            "--download",
            action="store_true",
            help="Télécharge le fichier Lichess avant import",
        )
        parser.add_argument(
            "--clear-lichess",
            action="store_true",
            help="Supprime les puzzles source=lichess avant import",
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        source = options["file"] or None

        if options["download"] or (not source and not DEFAULT_CACHE.exists()):
            self.stdout.write("Téléchargement de la base Lichess (~150 Mo)…")
            path = download_lichess_db()
            self.stdout.write(self.style.SUCCESS(f"Fichier cache : {path}"))
            source = str(path)

        if options["clear_lichess"]:
            deleted, _ = Puzzle.objects.filter(source="lichess").delete()
            self.stdout.write(f"Supprimé {deleted} puzzles lichess")

        existing_fens = set(Puzzle.objects.values_list("fen", flat=True))
        per_diff = {k: 0 for k in RATING_TARGETS}
        batch: list[Puzzle] = []
        created = 0
        skipped = 0
        batch_size = 200

        self.stdout.write(
            f"Import jusqu'à {limit} puzzles "
            f"(cibles: {RATING_TARGETS}, popularité ≥ {options['min_popularity']})…"
        )

        for data in iter_valid_puzzles(
            source,
            min_rating=options["min_rating"],
            max_rating=options["max_rating"],
            min_popularity=options["min_popularity"],
            limit=limit,
        ):
            if data["fen"] in existing_fens:
                skipped += 1
                continue

            existing_fens.add(data["fen"])
            per_diff[data["difficulty"]] = per_diff.get(data["difficulty"], 0) + 1
            batch.append(
                Puzzle(
                    fen=data["fen"],
                    solution_moves=data["solution_moves"],
                    themes=data["themes"],
                    difficulty=data["difficulty"],
                    rating=data["rating"],
                    source="lichess",
                )
            )

            if len(batch) >= batch_size:
                with transaction.atomic():
                    Puzzle.objects.bulk_create(batch, ignore_conflicts=True)
                created += len(batch)
                batch.clear()
                self.stdout.write(f"  … {created} insérés", ending="\r")

        if batch:
            with transaction.atomic():
                Puzzle.objects.bulk_create(batch, ignore_conflicts=True)
            created += len(batch)

        # Puzzle du jour depuis le pool lichess (medium, bon rating)
        today = timezone.now().date()
        daily = (
            Puzzle.objects.filter(source="lichess", difficulty="medium", rating__gte=1000)
            .order_by("-rating")
            .first()
        ) or Puzzle.objects.filter(source="lichess").order_by("rating").first()

        if daily:
            Puzzle.objects.filter(is_daily=True).update(is_daily=False, daily_date=None)
            daily.is_daily = True
            daily.daily_date = today
            daily.save(update_fields=["is_daily", "daily_date"])

            candidates = list(
                Puzzle.objects.filter(source="lichess", difficulty="medium").order_by("rating")[:30]
            )
            for i, day_offset in enumerate(range(1, 8)):
                if i >= len(candidates):
                    break
                p = candidates[i]
                p.daily_date = today + timedelta(days=day_offset)
                p.save(update_fields=["daily_date"])

        total = Puzzle.objects.filter(source="lichess").count()
        all_total = Puzzle.objects.count()
        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Import Lichess : +{created} nouveaux, {skipped} doublons ignorés\n"
                f"  lichess en base : {total} | total puzzles : {all_total}\n"
                f"  par niveau : {per_diff}"
            )
        )
