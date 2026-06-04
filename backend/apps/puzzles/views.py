from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.engine import ChessEngineService

from .models import Puzzle, PuzzleAttempt
from .serializers import PuzzleSerializer, SubmitPuzzleSerializer


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
        if solved:
            if request.user.stats:
                request.user.stats.puzzles_solved += 1
                request.user.stats.save()
        puzzle.save()

        return Response({"solved": solved, "correct_moves": puzzle.solution_moves if solved else None})


class TacticalTrainingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        difficulty = request.query_params.get("difficulty", "medium")
        count = min(int(request.query_params.get("count", 10)), 20)
        puzzles = Puzzle.objects.filter(difficulty=difficulty).order_by("?")[:count]
        return Response(PuzzleSerializer(puzzles, many=True).data)
