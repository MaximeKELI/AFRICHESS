from django.contrib import admin

from .models import Badge, Course, LearningProfile, Lesson, Quiz, UserBadge, UserProgress


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["title", "level", "is_published", "order"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [LessonInline]


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ["title", "course", "lesson", "passing_score"]


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ["user", "course", "progress_percent", "quiz_passed"]


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "xp_reward"]


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ["user", "badge", "earned_at"]


@admin.register(LearningProfile)
class LearningProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "xp", "lessons_completed", "puzzle_accuracy"]
