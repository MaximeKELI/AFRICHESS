from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Puzzle, PuzzleAttempt
from .random_sample import random_queryset
from .serializers import PuzzleSerializer, SubmitPuzzleSerializer

DIFFICULTY_ALIASES = {
    "beginner": "easy",
    "intermediate": "medium",
    "advanced": "hard",
    "expert": "expert",
    "easy": "easy",
    "medium": "medium",
    "hard": "hard",
}


def _normalize_difficulty(raw: str) -> str:
    return DIFFICULTY_ALIASES.get((raw or "medium").lower(), "medium")


def _update_daily_streak(user, puzzle: Puzzle, solved: bool) -> int:
    if not solved or not puzzle.is_daily:
        return getattr(user.stats, "daily_puzzle_streak", 0) if hasattr(user, "stats") else 0
    stats = user.stats
    today = timezone.now().date()
    if stats.daily_puzzle_last_date == today:
        return stats.daily_puzzle_streak
    if stats.daily_puzzle_last_date == today - timedelta(days=1):
        stats.daily_puzzle_streak += 1
    else:
        stats.daily_puzzle_streak = 1
    stats.daily_puzzle_last_date = today
    stats.save(update_fields=["daily_puzzle_streak", "daily_puzzle_last_date"])
    return stats.daily_puzzle_streak


class DailyPuzzleView(generics.RetrieveAPIView):
    serializer_class = PuzzleSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        today = timezone.now().date()
        puzzle = Puzzle.objects.filter(is_daily=True, daily_date=today).first()
        if not puzzle:
            puzzle = Puzzle.objects.filter(is_daily=True).order_by("-daily_date").first()
        if not puzzle:
            puzzle = Puzzle.objects.first()
        return puzzle


class PuzzleListView(generics.ListAPIView):
    serializer_class = PuzzleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Puzzle.objects.all()
        difficulty = self.request.query_params.get("difficulty")
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        return qs[:30]


class PuzzleDetailView(generics.RetrieveAPIView):
    queryset = Puzzle.objects.all()
    serializer_class = PuzzleSerializer
    permission_classes = [permissions.AllowAny]


class SubmitPuzzleView(APIView):
    def post(self, request, pk):
        try:
            puzzle = Puzzle.objects.get(pk=pk)
        except Puzzle.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        ser = SubmitPuzzleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        moves = ser.validated_data["moves"]
        solved = moves == puzzle.solution_moves

        PuzzleAttempt.objects.create(
            user=request.user,
            puzzle=puzzle,
            solved=solved,
            moves_played=moves,
            time_seconds=ser.validated_data["time_seconds"],
        )
        puzzle.plays_count += 1
        streak = 0
        if solved:
            if request.user.stats:
                request.user.stats.puzzles_solved += 1
                request.user.stats.save(update_fields=["puzzles_solved"])
            streak = _update_daily_streak(request.user, puzzle, solved)
        puzzle.save()

        return Response({
            "solved": solved,
            "correct_moves": puzzle.solution_moves if solved else None,
            "daily_streak": streak,
        })


class TacticalTrainingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        difficulty = _normalize_difficulty(request.query_params.get("difficulty", "medium"))
        count = min(int(request.query_params.get("count", 10)), 20)
        puzzles = random_queryset(
            Puzzle.objects.filter(difficulty=difficulty), count
        )
        return Response(PuzzleSerializer(puzzles, many=True).data)


class PuzzleLeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.db.models import Count

        User = get_user_model()
        rows = list(
            PuzzleAttempt.objects.filter(solved=True)
            .values("user_id")
            .annotate(solved_count=Count("id"))
            .order_by("-solved_count")[:50]
        )
        user_ids = [r["user_id"] for r in rows]
        users = {
            u.pk: u
            for u in User.objects.filter(pk__in=user_ids).only(
                "id", "username", "display_name"
            )
        }
        out = []
        for i, row in enumerate(rows, 1):
            u = users.get(row["user_id"])
            if not u:
                continue
            out.append(
                {
                    "rank": i,
                    "username": u.username,
                    "display_name": u.display_name or u.username,
                    "solved_count": row["solved_count"],
                }
            )
        return Response(out)


class PuzzleRushView(APIView):
    """Lot de puzzles — mode rush (3 min, 3 erreurs max côté client)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        count = min(int(request.query_params.get("count", 15)), 20)
        puzzles = random_queryset(Puzzle.objects.all(), count)
        return Response(PuzzleSerializer(puzzles, many=True).data)


class PuzzleStreakView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        stats = request.user.stats
        return Response({
            "daily_streak": stats.daily_puzzle_streak,
            "last_date": stats.daily_puzzle_last_date.isoformat() if stats.daily_puzzle_last_date else None,
            "solved_today": (
                stats.daily_puzzle_last_date == timezone.now().date()
            ),
        })
