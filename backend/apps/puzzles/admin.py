from django.contrib import admin

from .models import Puzzle, PuzzleAttempt


@admin.register(Puzzle)
class PuzzleAdmin(admin.ModelAdmin):
    list_display = ["id", "difficulty", "rating", "is_daily", "daily_date", "plays_count"]
    list_filter = ["difficulty", "is_daily"]


@admin.register(PuzzleAttempt)
class PuzzleAttemptAdmin(admin.ModelAdmin):
    list_display = ["user", "puzzle", "solved", "time_seconds", "created_at"]
