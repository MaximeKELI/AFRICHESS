from django.conf import settings
from django.db import models


class Course(models.Model):
    class Level(models.TextChoices):
        BEGINNER = "beginner", "Débutant"
        INTERMEDIATE = "intermediate", "Intermédiaire"
        ADVANCED = "advanced", "Avancé"

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.BEGINNER)
    description = models.TextField(blank=True)
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
    content = models.TextField(help_text="Contenu markdown ou texte")
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
        from .progression import xp_for_level, xp_for_next_level

        return max(0, xp_for_next_level(self.level) - self.xp)
