"""Seed puzzles : catalogue local + import Lichess jusqu'à 10 000+."""

from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.puzzles.lichess_import import DEFAULT_CACHE, MIN_PUZZLE_POOL
from apps.puzzles.models import Puzzle


class Command(BaseCommand):
    help = f"Seed puzzles tactiques (catalogue + Lichess, min {MIN_PUZZLE_POOL})"

    def add_arguments(self, parser):
        parser.add_argument(
            "--min-total",
            type=int,
            default=MIN_PUZZLE_POOL,
            help=f"Nombre minimum de puzzles en base (défaut: {MIN_PUZZLE_POOL})",
        )
        parser.add_argument(
            "--skip-lichess",
            action="store_true",
            help="Ne pas importer depuis Lichess (catalogue seul)",
        )
        parser.add_argument(
            "--download",
            action="store_true",
            help="Télécharge la base Lichess si absente (~150 Mo)",
        )

    def handle(self, *args, **options):
        min_total = options["min_total"]
        verbosity = options["verbosity"]

        call_command("seed_puzzle_catalog", verbosity=verbosity)
        total = Puzzle.objects.count()
        self.stdout.write(f"Après catalogue : {total} puzzles")

        needed = max(0, min_total - total)
        if needed > 0 and not options["skip_lichess"]:
            # Marge pour doublons FEN et répartition par niveau
            import_limit = min_total + max(500, min_total // 10)
            self.stdout.write(
                f"Import Lichess : objectif +{needed} (limite scan {import_limit})…"
            )
            try:
                call_command(
                    "import_lichess_puzzles",
                    limit=import_limit,
                    download=options["download"] or not DEFAULT_CACHE.exists(),
                    verbosity=verbosity,
                )
            except Exception as exc:
                self.stdout.write(
                    self.style.WARNING(
                        f"Import Lichess échoué ({exc}). "
                        f"Lancez : python manage.py import_lichess_puzzles --download"
                    )
                )

        total = Puzzle.objects.count()
        if total >= min_total:
            self.stdout.write(
                self.style.SUCCESS(f"✓ {total} puzzles en base (objectif {min_total})")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"Seulement {total} puzzles (objectif {min_total}). "
                    "Importez Lichess : python manage.py seed_puzzles --download"
                )
            )
