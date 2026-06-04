"""Seed sample puzzles for development."""
from django.core.management.base import BaseCommand

from apps.puzzles.models import Puzzle


SAMPLE_PUZZLES = [
    {
        "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 4",
        "solution_moves": ["f6g4"],
        "themes": ["mate", "scholar"],
        "difficulty": "easy",
        "rating": 800,
    },
    {
        "fen": "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2",
        "solution_moves": ["d8h4"],
        "themes": ["mate"],
        "difficulty": "easy",
        "rating": 900,
    },
    {
        "fen": "6k1/5ppp/8/8/8/8/8/R6K w - - 0 1",
        "solution_moves": ["a1a8"],
        "themes": ["back_rank"],
        "difficulty": "medium",
        "rating": 1100,
    },
]


class Command(BaseCommand):
    help = "Seed sample chess puzzles"

    def handle(self, *args, **options):
        for data in SAMPLE_PUZZLES:
            Puzzle.objects.get_or_create(fen=data["fen"], defaults=data)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(SAMPLE_PUZZLES)} puzzles"))
