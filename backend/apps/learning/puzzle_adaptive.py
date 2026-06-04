"""Puzzles adaptatifs — réutilise apps.puzzles sans dupliquer les modèles."""

from django.utils import timezone

from apps.puzzles.models import Puzzle, PuzzleAttempt
from apps.puzzles.serializers import PuzzleSerializer

LEVEL_TO_DIFFICULTY = {
    "beginner": "easy",
    "intermediate": "medium",
    "advanced": "hard",
    "expert": "expert",
    "master": "expert",
}

CHESS_LEVEL_MAP = {
    "beginner": "easy",
    "intermediate": "medium",
    "advanced": "hard",
    "expert": "expert",
    "master": "expert",
}


def difficulty_for_user(user) -> str:
    if user and getattr(user, "chess_level", None):
        return CHESS_LEVEL_MAP.get(user.chess_level, "medium")
    return "medium"


def adaptive_difficulty(user) -> str:
    """Ajuste selon le taux de réussite récent (10 dernières tentatives)."""
    base = difficulty_for_user(user)
    if not user or not user.is_authenticated:
        return base

    attempts = PuzzleAttempt.objects.filter(user=user).order_by("-created_at")[:10]
    if len(attempts) < 3:
        return base

    solved = sum(1 for a in attempts if a.solved)
    rate = solved / len(attempts)
    order = ["easy", "medium", "hard", "expert"]
    idx = order.index(base) if base in order else 1

    if rate >= 0.8 and idx < len(order) - 1:
        return order[idx + 1]
    if rate <= 0.3 and idx > 0:
        return order[idx - 1]
    return base


def get_daily_puzzle():
    today = timezone.now().date()
    puzzle = Puzzle.objects.filter(is_daily=True, daily_date=today).first()
    if not puzzle:
        puzzle = Puzzle.objects.filter(is_daily=True).order_by("-daily_date").first()
    if not puzzle:
        puzzle = Puzzle.objects.first()
    return puzzle


def get_adaptive_puzzles(user, count: int = 10):
    diff = adaptive_difficulty(user)
    qs = Puzzle.objects.filter(difficulty=diff).order_by("?")[:count]
    if qs.count() < count:
        extra = Puzzle.objects.exclude(difficulty=diff).order_by("?")[: count - qs.count()]
        qs = list(qs) + list(extra)
    return PuzzleSerializer(qs, many=True).data
