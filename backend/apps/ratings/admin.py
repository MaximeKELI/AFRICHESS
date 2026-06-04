from django.contrib import admin

from .models import PlayerRating, RatingHistory


@admin.register(PlayerRating)
class PlayerRatingAdmin(admin.ModelAdmin):
    list_display = ["user", "mode", "elo", "peak_elo", "games_count"]
    list_filter = ["mode"]


@admin.register(RatingHistory)
class RatingHistoryAdmin(admin.ModelAdmin):
    list_display = ["user", "mode", "elo_before", "elo_after", "change", "created_at"]
