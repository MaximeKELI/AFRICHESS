from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.puzzles.models import Puzzle, PuzzleAttempt
from apps.puzzles.serializers import PuzzleSerializer, SubmitPuzzleSerializer

from .coach import generate_coach_tips
from .models import Badge, Course, LearningProfile, Lesson, Quiz, UserBadge, UserProgress
from .pgn_analysis import analyze_pgn
from .progression import add_xp, get_or_create_profile, record_puzzle_result, update_course_progress
from .puzzle_adaptive import get_adaptive_puzzles, get_daily_puzzle
from .serializers import (
    AnalyzePgnSerializer,
    BadgeSerializer,
    CompleteLessonSerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    LearningProfileSerializer,
    LessonSerializer,
    QuizPublicSerializer,
    SubmitQuizSerializer,
    UserBadgeSerializer,
    UserProgressSerializer,
)


class DashboardView(APIView):
    """Vue d'ensemble : cours, puzzles, progression, coach."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = get_or_create_profile(user)
        courses = Course.objects.filter(is_published=True)[:6]
        progress = UserProgress.objects.filter(user=user).select_related("course")
        badges = UserBadge.objects.filter(user=user).select_related("badge")[:8]
        daily = get_daily_puzzle()
        stats = getattr(user, "stats", None)

        return Response({
            "profile": LearningProfileSerializer(profile).data,
            "courses": CourseListSerializer(courses, many=True).data,
            "progress": UserProgressSerializer(progress, many=True).data,
            "badges": UserBadgeSerializer(badges, many=True).data,
            "daily_puzzle": PuzzleSerializer(daily).data if daily else None,
            "coach_tips": generate_coach_tips(user),
            "stats": {
                "games_played": stats.games_played if stats else 0,
                "puzzles_solved": stats.puzzles_solved if stats else 0,
                "win_rate": stats.win_rate if stats else 0,
            },
        })


class CourseListView(generics.ListAPIView):
    serializer_class = CourseListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Course.objects.filter(is_published=True)
        level = self.request.query_params.get("level")
        if level:
            qs = qs.filter(level=level)
        return qs


class CourseDetailView(generics.RetrieveAPIView):
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    queryset = Course.objects.filter(is_published=True)


class LessonDetailView(generics.RetrieveAPIView):
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Lesson.objects.all()


class CompleteLessonView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        try:
            course = Course.objects.get(slug=slug, is_published=True)
        except Course.DoesNotExist:
            return Response({"error": "Cours introuvable"}, status=404)

        ser = CompleteLessonSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        lesson_id = ser.validated_data["lesson_id"]

        try:
            lesson = course.lessons.get(pk=lesson_id)
        except Lesson.DoesNotExist:
            return Response({"error": "Leçon introuvable"}, status=404)

        prog, _ = UserProgress.objects.get_or_create(user=request.user, course=course)
        already = lesson_id in (prog.completed_lesson_ids or [])
        progress = update_course_progress(request.user, course, lesson.id)
        xp_gained = 0
        if not already:
            profile = get_or_create_profile(request.user)
            profile.lessons_completed += 1
            profile.save(update_fields=["lessons_completed", "updated_at"])
            add_xp(request.user, lesson.xp_reward)
            xp_gained = lesson.xp_reward

        return Response({
            "progress": UserProgressSerializer(progress).data,
            "xp_gained": xp_gained,
        })


class QuizDetailView(generics.RetrieveAPIView):
    serializer_class = QuizPublicSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Quiz.objects.all()


class SubmitQuizView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            quiz = Quiz.objects.get(pk=pk)
        except Quiz.DoesNotExist:
            return Response({"error": "Quiz introuvable"}, status=404)

        ser = SubmitQuizSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        answers = ser.validated_data["answers"]
        questions = quiz.questions or []

        if len(answers) != len(questions):
            return Response({"error": "Nombre de réponses incorrect"}, status=400)

        correct = 0
        for i, q in enumerate(questions):
            if answers[i] == q.get("correct_index", -1):
                correct += 1

        score = int((correct / len(questions)) * 100) if questions else 0
        passed = score >= quiz.passing_score

        if passed:
            profile = get_or_create_profile(request.user)
            profile.quizzes_passed += 1
            profile.save(update_fields=["quizzes_passed", "updated_at"])
            add_xp(request.user, quiz.xp_reward)
            if quiz.course:
                prog, _ = UserProgress.objects.get_or_create(
                    user=request.user, course=quiz.course
                )
                prog.quiz_passed = True
                prog.progress_percent = 100
                prog.save()

        return Response({
            "score": score,
            "passed": passed,
            "correct": correct,
            "total": len(questions),
            "xp_gained": quiz.xp_reward if passed else 0,
        })


class AnalyzePgnView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = AnalyzePgnSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pgn = ser.validated_data["pgn"].strip()
        if not pgn:
            return Response({"error": "PGN vide"}, status=400)

        result = analyze_pgn(pgn)
        profile = get_or_create_profile(request.user)
        profile.analyses_run += 1
        profile.save(update_fields=["analyses_run", "updated_at"])
        add_xp(request.user, 5)

        return Response(result)


class DailyPuzzleView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        puzzle = get_daily_puzzle()
        if not puzzle:
            return Response({"error": "Aucun puzzle"}, status=404)
        return Response(PuzzleSerializer(puzzle).data)


class AdaptivePuzzlesView(APIView):
    def get(self, request):
        count = min(int(request.query_params.get("count", 10)), 20)
        data = get_adaptive_puzzles(request.user, count)
        return Response(data)


class SubmitPuzzleAttemptView(APIView):
    """Tentative puzzle + XP et stats learning."""

    def post(self, request, pk):
        try:
            puzzle = Puzzle.objects.get(pk=pk)
        except Puzzle.DoesNotExist:
            return Response({"error": "Puzzle introuvable"}, status=404)

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
        puzzle.save(update_fields=["plays_count"])

        if solved and hasattr(request.user, "stats") and request.user.stats:
            request.user.stats.puzzles_solved += 1
            request.user.stats.save(update_fields=["puzzles_solved"])

        record_puzzle_result(request.user, solved)

        return Response({
            "solved": solved,
            "xp_gained": 10 if solved else 0,
            "correct_moves": puzzle.solution_moves if solved else None,
        })


class CoachTipsView(APIView):
    def get(self, request):
        return Response({"tips": generate_coach_tips(request.user)})


class LearningProfileView(APIView):
    def get(self, request):
        profile = get_or_create_profile(request.user)
        return Response(LearningProfileSerializer(profile).data)


class BadgeListView(generics.ListAPIView):
    serializer_class = BadgeSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Badge.objects.all()


class MyBadgesView(generics.ListAPIView):
    serializer_class = UserBadgeSerializer

    def get_queryset(self):
        return UserBadge.objects.filter(user=self.request.user).select_related("badge")


class MyProgressView(generics.ListAPIView):
    serializer_class = UserProgressSerializer

    def get_queryset(self):
        return UserProgress.objects.filter(user=self.request.user).select_related("course")
