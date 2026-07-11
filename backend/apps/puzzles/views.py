from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .daily import get_daily_puzzle
from .models import Puzzle, PuzzleAttempt, PuzzleBattle, PuzzleBattleQueue, PuzzleRushSession
from .puzzle_catalog import PUZZLE_THEMES
from .random_sample import random_queryset
from .serializers import PuzzleSerializer, SubmitPuzzleSerializer
from .submit_service import process_puzzle_submission

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


class DailyPuzzleView(generics.RetrieveAPIView):
    serializer_class = PuzzleSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        puzzle = get_daily_puzzle()
        if not puzzle:
            from rest_framework.exceptions import NotFound

            raise NotFound("Aucun puzzle")
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
        result = process_puzzle_submission(
            request.user,
            puzzle,
            ser.validated_data["moves"],
            ser.validated_data["time_seconds"],
        )
        return Response(result)


class PuzzleThemesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        db_themes = set()
        for row in Puzzle.objects.values_list("themes", flat=True):
            if isinstance(row, list):
                db_themes.update(row)
        themes = sorted(db_themes or PUZZLE_THEMES)
        return Response({"themes": themes})


class TacticalTrainingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        difficulty = _normalize_difficulty(request.query_params.get("difficulty", "medium"))
        theme = request.query_params.get("theme")
        count = min(int(request.query_params.get("count", 10)), 20)
        qs = Puzzle.objects.filter(difficulty=difficulty)
        if theme:
            qs = qs.filter(themes__contains=[theme])
        puzzles = random_queryset(qs, count)
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
            for u in User.objects.filter(pk__in=user_ids).only("id", "username")
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


class PuzzleRushStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.users.premium_utils import can_start_puzzle_rush, record_puzzle_rush_start

        from .rush_battle import start_rush_session

        ok, code = can_start_puzzle_rush(request.user)
        if not ok:
            return Response({"error": "Limite rush atteinte", "code": code}, status=403)
        record_puzzle_rush_start(request.user)
        session = start_rush_session(request.user)
        first = Puzzle.objects.get(pk=session.puzzle_ids[0])
        return Response({
            "session_id": session.id,
            "puzzle": PuzzleSerializer(first).data,
            "ends_at": session.ends_at.isoformat(),
            "duration": 180,
        }, status=201)


class PuzzleRushSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        from .rush_battle import rush_submit

        try:
            session = PuzzleRushSession.objects.get(pk=session_id, user=request.user)
        except PuzzleRushSession.DoesNotExist:
            return Response({"error": "Session introuvable"}, status=404)

        ser = SubmitPuzzleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = rush_submit(session, ser.validated_data["moves"])
        if result.get("next_puzzle_id"):
            p = Puzzle.objects.get(pk=result["next_puzzle_id"])
            result["next_puzzle"] = PuzzleSerializer(p).data
        return Response(result)


class PuzzleStormStartView(APIView):
    """Puzzle Storm — 3 min, flux illimité (parité Lichess Storm)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .storm import start_storm_session

        # Storm libre (parité Lichess) — ne consomme pas le quota Rush
        session = start_storm_session(request.user)
        first = Puzzle.objects.get(pk=session.puzzle_ids[0])
        return Response(
            {
                "session_id": session.id,
                "mode": "storm",
                "puzzle": PuzzleSerializer(first).data,
                "ends_at": session.ends_at.isoformat(),
                "duration": 180,
            },
            status=201,
        )


class PuzzleStormSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        from .storm import storm_submit

        try:
            session = PuzzleRushSession.objects.get(pk=session_id, user=request.user)
        except PuzzleRushSession.DoesNotExist:
            return Response({"error": "Session introuvable"}, status=404)

        ser = SubmitPuzzleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = storm_submit(session, ser.validated_data["moves"])
        if result.get("next_puzzle_id"):
            p = Puzzle.objects.get(pk=result["next_puzzle_id"])
            result["next_puzzle"] = PuzzleSerializer(p).data
        return Response(result)


class PuzzleBattleQueueView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .rush_battle import join_battle_queue

        battle = join_battle_queue(request.user)
        data = {"battle_id": battle.id, "status": battle.status}
        if battle.player2_id:
            data["opponent"] = battle.player2.username if battle.player1_id == request.user.id else battle.player1.username
        data["player1_id"] = battle.player1_id
        data["player2_id"] = battle.player2_id
        if battle.status == PuzzleBattle.Status.ACTIVE and battle.puzzle_ids:
            data["puzzle"] = PuzzleSerializer(Puzzle.objects.get(pk=battle.puzzle_ids[0])).data
        return Response(data, status=201 if battle.status == PuzzleBattle.Status.ACTIVE else 202)

    def delete(self, request):
        PuzzleBattleQueue.objects.filter(user=request.user).delete()
        return Response({"status": "left"})


class PuzzleBattleDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, battle_id):
        try:
            battle = PuzzleBattle.objects.get(pk=battle_id)
        except PuzzleBattle.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)
        if request.user.id not in (battle.player1_id, battle.player2_id):
            return Response({"error": "Accès refusé"}, status=403)
        puzzle = None
        if battle.status == PuzzleBattle.Status.ACTIVE and battle.current_index < len(battle.puzzle_ids):
            puzzle = PuzzleSerializer(Puzzle.objects.get(pk=battle.puzzle_ids[battle.current_index])).data
        opponent = None
        if request.user.id == battle.player1_id and battle.player2_id:
            opponent = battle.player2.username
        elif request.user.id == battle.player2_id:
            opponent = battle.player1.username
        return Response({
            "id": battle.id,
            "status": battle.status,
            "score1": battle.score1,
            "score2": battle.score2,
            "player1_id": battle.player1_id,
            "player2_id": battle.player2_id,
            "opponent": opponent,
            "puzzle": puzzle,
            "winner_id": battle.winner_id,
        })

    def post(self, request, battle_id):
        from .rush_battle import battle_submit

        try:
            battle = PuzzleBattle.objects.get(pk=battle_id)
        except PuzzleBattle.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)
        ser = SubmitPuzzleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        return Response(battle_submit(battle, request.user, ser.validated_data["moves"]))


class CustomPuzzleCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import chess

        fen = request.data.get("fen", "").strip()
        solution_moves = request.data.get("solution_moves", [])
        themes = request.data.get("themes", [])
        if not fen or not solution_moves:
            return Response({"error": "FEN et solution requis"}, status=400)
        try:
            board = chess.Board(fen)
            for uci in solution_moves:
                board.push_uci(uci)
        except Exception:
            return Response({"error": "Position ou solution invalide"}, status=400)

        puzzle = Puzzle.objects.create(
            fen=fen,
            solution_moves=solution_moves,
            themes=themes if isinstance(themes, list) else [],
            author=request.user,
            is_public=bool(request.data.get("is_public", False)),
            source="user",
            difficulty=request.data.get("difficulty", "medium"),
        )
        return Response(PuzzleSerializer(puzzle).data, status=201)

    def get(self, request):
        qs = Puzzle.objects.filter(author=request.user, source="user").order_by("-created_at")[:30]
        return Response(PuzzleSerializer(qs, many=True).data)


class PuzzleSurvivalStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .rush_battle import start_survival_session

        session = start_survival_session(request.user)
        first = Puzzle.objects.get(pk=session.puzzle_ids[0]) if session.puzzle_ids else None
        return Response(
            {
                "session_id": session.id,
                "puzzle": PuzzleSerializer(first).data if first else None,
                "mode": "survival",
            },
            status=201,
        )


class PuzzleSurvivalSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        from .rush_battle import survival_submit

        try:
            session = PuzzleRushSession.objects.get(pk=session_id, user=request.user)
        except PuzzleRushSession.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)
        ser = SubmitPuzzleSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = survival_submit(session, ser.validated_data["moves"])
        if result.get("next_puzzle_id"):
            result["next_puzzle"] = PuzzleSerializer(
                Puzzle.objects.get(pk=result["next_puzzle_id"])
            ).data
        return Response(result)


class PuzzleRushLeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.db.models import Max

        rows = (
            PuzzleRushSession.objects.filter(status=PuzzleRushSession.Status.COMPLETED)
            .values("user_id")
            .annotate(best_score=Max("score"))
            .order_by("-best_score")[:20]
        )
        User = get_user_model()
        users = {u.pk: u for u in User.objects.filter(pk__in=[r["user_id"] for r in rows])}
        return Response([
            {
                "username": u.username,
                "display_name": u.display_name or u.username,
                "score": r["best_score"],
            }
            for r in rows
            if (u := users.get(r["user_id"]))
        ])


class PuzzleRushView(APIView):
    """Lot de puzzles — mode rush (3 min, 3 erreurs max côté client)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.users.premium_utils import can_start_puzzle_rush, record_puzzle_rush_start

        ok, code = can_start_puzzle_rush(request.user)
        if not ok:
            return Response(
                {"error": "Daily Puzzle Rush limit reached. Upgrade to Premium.", "code": code},
                status=403,
            )
        record_puzzle_rush_start(request.user)
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
