from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, UserStats


class UserStatsInline(admin.StackedInline):
    model = UserStats
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = [UserStatsInline]
    list_display = ["username", "email", "country", "title", "is_african_highlight", "is_staff"]
    list_filter = ["country", "is_african_highlight", "preferred_language"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("AFRICHESS", {"fields": ("avatar", "avatar_preset", "chess_level", "bio", "country", "city",
                                   "preferred_language", "is_african_highlight", "low_bandwidth_mode",
                                   "title", "fide_id")}),
    )


@admin.register(UserStats)
class UserStatsAdmin(admin.ModelAdmin):
    list_display = ["user", "games_played", "games_won", "puzzles_solved"]
