from rest_framework import serializers

from .models import Badge, Course, LearningProfile, Lesson, Quiz, UserBadge, UserProgress


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ["id", "title", "content", "video_url", "order", "xp_reward"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        lang = self.context.get("lang", "fr")
        if lang == "en":
            if getattr(instance, "title_en", ""):
                data["title"] = instance.title_en
            if getattr(instance, "content_en", ""):
                data["content"] = instance.content_en
            else:
                from pathlib import Path

                from .i18n_meta import LESSONS_EN

                course_slug = instance.course.slug
                file_map = LESSONS_EN.get(course_slug, {})
                for fr_file, en_title in file_map.items():
                    if en_title and instance.title and en_title.lower() in instance.title.lower():
                        data["title"] = en_title
                en_dir = Path(__file__).resolve().parent / "curriculum" / "en"
                for md in en_dir.glob("*.md"):
                    en_content = md.read_text(encoding="utf-8")
                    if md.stem in (instance.title or "").replace(" ", "-").lower()[:20] or "histoire" in md.stem:
                        if "histoire" in md.stem and "histoire" in (instance.content or "").lower()[:200]:
                            data["content"] = en_content
                            data["title"] = "World and African Chess History"
                            break
        return data


class QuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ["id", "title", "questions", "passing_score", "xp_reward"]
        # questions sans correct_index exposé côté client — géré dans QuizPublicSerializer


class QuizPublicSerializer(serializers.ModelSerializer):
    """Questions sans révéler correct_index."""

    questions = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ["id", "title", "questions", "passing_score"]

    def get_questions(self, obj):
        out = []
        for q in obj.questions or []:
            out.append({
                "question": q.get("question", ""),
                "options": q.get("options", []),
            })
        return out


class CourseListSerializer(serializers.ModelSerializer):
    lesson_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = [
            "id", "slug", "title", "level", "description", "thumbnail",
            "lesson_count", "xp_reward",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        lang = self.context.get("lang", "fr")
        if lang == "en":
            from .i18n_meta import COURSES_EN

            meta = COURSES_EN.get(instance.slug, {})
            if meta.get("title"):
                data["title"] = meta["title"]
            if meta.get("description"):
                data["description"] = meta["description"]
            elif getattr(instance, "description_en", ""):
                data["description"] = instance.description_en
            if getattr(instance, "title_en", ""):
                data["title"] = instance.title_en
        return data


class CourseDetailSerializer(serializers.ModelSerializer):
    lessons = serializers.SerializerMethodField()
    quizzes = QuizPublicSerializer(many=True, read_only=True)
    user_progress = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id", "slug", "title", "level", "description", "thumbnail",
            "lessons", "quizzes", "xp_reward", "user_progress",
        ]

    def get_lessons(self, obj):
        lang = self.context.get("lang", "fr")
        return LessonSerializer(
            obj.lessons.all(), many=True, context={"lang": lang}
        ).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        lang = self.context.get("lang", "fr")
        if lang == "en":
            from .i18n_meta import COURSES_EN

            meta = COURSES_EN.get(instance.slug, {})
            if meta.get("title"):
                data["title"] = meta["title"]
            if meta.get("description"):
                data["description"] = meta["description"]
        return data

    def get_user_progress(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        prog = UserProgress.objects.filter(user=request.user, course=obj).first()
        if not prog:
            return {"progress_percent": 0, "completed_lesson_ids": [], "quiz_passed": False}
        return {
            "progress_percent": prog.progress_percent,
            "completed_lesson_ids": prog.completed_lesson_ids,
            "quiz_passed": prog.quiz_passed,
        }


class UserProgressSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = UserProgress
        fields = [
            "id", "course", "course_title", "progress_percent",
            "completed_lesson_ids", "quiz_passed", "updated_at",
        ]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "code", "name", "description", "icon", "xp_reward"]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ["badge", "earned_at"]


class LearningProfileSerializer(serializers.ModelSerializer):
    level = serializers.IntegerField(read_only=True)
    xp_to_next_level = serializers.IntegerField(read_only=True)

    class Meta:
        model = LearningProfile
        fields = [
            "xp", "level", "xp_to_next_level", "lessons_completed", "quizzes_passed",
            "puzzles_attempted", "puzzles_solved_learning", "puzzle_accuracy",
            "analyses_run",
        ]


class SubmitQuizSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        help_text="Index de réponse pour chaque question",
    )


class CompleteLessonSerializer(serializers.Serializer):
    lesson_id = serializers.IntegerField()


class AnalyzePgnSerializer(serializers.Serializer):
    pgn = serializers.CharField()
