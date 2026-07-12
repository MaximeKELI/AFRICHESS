from django.conf import settings
from django.db import models


class Course(models.Model):
    class Level(models.TextChoices):
        BEGINNER = "beginner", "Débutant"
        INTERMEDIATE = "intermediate", "Intermédiaire"
        ADVANCED = "advanced", "Avancé"

    title = models.CharField(max_length=200)
    title_en = models.CharField(max_length=200, blank=True)
    slug = models.SlugField(unique=True)
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.BEGINNER)
    description = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    thumbnail = models.URLField(blank=True)
    is_published = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    xp_reward = models.PositiveIntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return self.title

    @property
    def lesson_count(self):
        return self.lessons.count()


class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    title_en = models.CharField(max_length=200, blank=True)
    content = models.TextField(help_text="Contenu markdown ou texte")
    content_en = models.TextField(blank=True)
    video_url = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=0)
    xp_reward = models.PositiveIntegerField(default=15)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        unique_together = ["course", "order"]

    def __str__(self):
        return f"{self.course.title} — {self.title}"


class Quiz(models.Model):
    lesson = models.OneToOneField(
        Lesson, on_delete=models.CASCADE, related_name="quiz", null=True, blank=True
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="quizzes", null=True, blank=True
    )
    title = models.CharField(max_length=200)
    questions = models.JSONField(
        default=list,
        help_text='[{"question": "...", "options": ["a","b"], "correct_index": 0}]',
    )
    passing_score = models.PositiveIntegerField(default=70, help_text="Score minimum %")
    xp_reward = models.PositiveIntegerField(default=25)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class QuizAttempt(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quiz_attempts",
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    score = models.PositiveIntegerField(default=0)
    passed = models.BooleanField(default=False)
    xp_awarded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "quiz"]


class UserProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_progress"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="user_progress")
    progress_percent = models.PositiveIntegerField(default=0)
    completed_lesson_ids = models.JSONField(default=list)
    quiz_passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "course"]

    def __str__(self):
        return f"{self.user} — {self.course} ({self.progress_percent}%)"


class Badge(models.Model):
    code = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default="🏅")
    xp_reward = models.PositiveIntegerField(default=10)

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="badges_earned"
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "badge"]


class LearningProfile(models.Model):
    """XP, niveau et stats d'apprentissage (complète UserStats jeux)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_profile"
    )
    xp = models.PositiveIntegerField(default=0)
    lessons_completed = models.PositiveIntegerField(default=0)
    quizzes_passed = models.PositiveIntegerField(default=0)
    puzzles_attempted = models.PositiveIntegerField(default=0)
    puzzles_solved_learning = models.PositiveIntegerField(default=0)
    puzzle_accuracy = models.FloatField(default=0.0)
    analyses_run = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Learning: {self.user.username} L{self.level}"

    @property
    def level(self) -> int:
        from .progression import level_from_xp

        return level_from_xp(self.xp)

    @property
    def xp_to_next_level(self) -> int:
        from .progression import xp_for_next_level

        return max(0, xp_for_next_level(self.level) - self.xp)


class Video(models.Model):
    """Vidéothèque pédagogique."""

    title = models.CharField(max_length=200)
    title_en = models.CharField(max_length=200, blank=True)
    url = models.URLField(help_text="YouTube ou Vimeo")
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, default="general")
    course = models.ForeignKey(
        Course, on_delete=models.SET_NULL, null=True, blank=True, related_name="videos"
    )
    is_premium = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "title"]

    def __str__(self):
        return self.title


class OpeningRepertoire(models.Model):
    """Répertoire d'ouvertures personnel."""

    class Color(models.TextChoices):
        WHITE = "white", "White"
        BLACK = "black", "Black"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="repertoires"
    )
    name = models.CharField(max_length=120)
    color = models.CharField(max_length=10, choices=Color.choices, default=Color.WHITE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} — {self.name}"


class RepertoireLine(models.Model):
    repertoire = models.ForeignKey(
        OpeningRepertoire, on_delete=models.CASCADE, related_name="lines"
    )
    name = models.CharField(max_length=120)
    moves_san = models.JSONField(default=list, help_text="Liste de coups SAN")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class StudyLine(models.Model):
    """Ligne d'étude type Chessable (PGN / séquence de coups)."""

    class Color(models.TextChoices):
        WHITE = "white", "White"
        BLACK = "black", "Black"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_lines"
    )
    name = models.CharField(max_length=120)
    color = models.CharField(max_length=10, choices=Color.choices, default=Color.WHITE)
    moves_uci = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class LineReview(models.Model):
    """Planification spaced repetition (SM-2 simplifié)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    line = models.ForeignKey(StudyLine, on_delete=models.CASCADE, related_name="reviews")
    ease_factor = models.FloatField(default=2.5)
    interval_days = models.PositiveIntegerField(default=1)
    repetitions = models.PositiveIntegerField(default=0)
    next_review = models.DateTimeField()
    last_review = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["user", "line"]


class ClassroomSession(models.Model):
    """Salle de cours — plateau partagé (REST, sans WebRTC)."""

    host = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="classrooms_hosted"
    )
    code = models.CharField(max_length=8, unique=True)
    title = models.CharField(max_length=120, blank=True)
    current_fen = models.CharField(max_length=120, default="startpos")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Classroom {self.code}"


class SharedStudy(models.Model):
    """Study partagée (équivalent Lichess Studies v1)."""

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        UNLISTED = "unlisted", "Unlisted"
        PRIVATE = "private", "Private"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_studies"
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    visibility = models.CharField(
        max_length=20, choices=Visibility.choices, default=Visibility.PRIVATE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class StudyChapter(models.Model):
    study = models.ForeignKey(SharedStudy, on_delete=models.CASCADE, related_name="chapters")
    title = models.CharField(max_length=200)
    order = models.PositiveSmallIntegerField(default=0)
    pgn = models.TextField(blank=True)
    initial_fen = models.CharField(
        max_length=120,
        default="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    )

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.study.title} — {self.title}"


class StudyCollaborator(models.Model):
    class Role(models.TextChoices):
        VIEWER = "viewer", "Viewer"
        EDITOR = "editor", "Editor"

    study = models.ForeignKey(SharedStudy, on_delete=models.CASCADE, related_name="collaborators")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_collaborations"
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["study", "user"]


class PracticeSection(models.Model):
    """Section Practice (Checkmates, Tactics, Endgames…)."""

    slug = models.SlugField(unique=True, max_length=64)
    name = models.CharField(max_length=120)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "slug"]

    def __str__(self):
        return self.name


class PracticeStudy(models.Model):
    section = models.ForeignKey(PracticeSection, on_delete=models.CASCADE, related_name="studies")
    slug = models.SlugField(max_length=120)
    lichess_id = models.CharField(max_length=16, unique=True)
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=300, blank=True)
    source = models.CharField(max_length=20, default="lichess")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "title"]
        unique_together = ["section", "slug"]

    def __str__(self):
        return self.title


class PracticeChapter(models.Model):
    class Goal(models.TextChoices):
        MATE = "mate", "Mate"
        MATE_IN = "mateIn", "Mate in N"
        DRAW_IN = "drawIn", "Draw in N"
        EVAL_IN = "evalIn", "Eval"
        GENERIC = "generic", "Generic"

    study = models.ForeignKey(PracticeStudy, on_delete=models.CASCADE, related_name="chapters")
    title = models.CharField(max_length=200)
    order = models.PositiveSmallIntegerField(default=0)
    fen = models.CharField(max_length=120)
    pgn = models.TextField(blank=True)
    solution_uci = models.JSONField(default=list, help_text="Main-line UCI moves")
    goal = models.CharField(max_length=20, choices=Goal.choices, default=Goal.GENERIC)
    goal_moves = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.study.title} — {self.title}"


class PracticeProgress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="practice_progress"
    )
    chapter = models.ForeignKey(
        PracticeChapter, on_delete=models.CASCADE, related_name="progress_entries"
    )
    nb_moves = models.PositiveSmallIntegerField(default=0)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "chapter"]
        indexes = [models.Index(fields=["user", "-completed_at"])]
