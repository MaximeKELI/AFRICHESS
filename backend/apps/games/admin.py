from django.contrib import admin

from .models import Game, GameAnalysis, GameRoom, MatchmakingQueue, Move


class MoveInline(admin.TabularInline):
    model = Move
    extra = 0


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    inlines = [MoveInline]
    list_display = ["id", "mode", "status", "white_player", "black_player", "result", "created_at"]
    list_filter = ["mode", "status", "is_vs_ai"]


@admin.register(MatchmakingQueue)
class MatchmakingQueueAdmin(admin.ModelAdmin):
    list_display = ["user", "mode", "elo", "joined_at"]
