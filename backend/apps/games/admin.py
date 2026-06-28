from django.contrib import admin

from .models import (
    FairPlayAppeal,
    FairPlayAuditLog,
    FairPlayReport,
    FairPlayReviewCase,
    FairPlaySanction,
    FairPlayUserConsent,
    Game,
    GameAnalysis,
    GameFairPlayTelemetry,
    GameRoom,
    MatchmakingQueue,
    Move,
)


@admin.register(GameRoom)
class GameRoomAdmin(admin.ModelAdmin):
    list_display = ["room_id", "game", "white_connected", "black_connected", "last_activity"]


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


@admin.register(FairPlayReport)
class FairPlayReportAdmin(admin.ModelAdmin):
    list_display = [
        "analyzed_at",
        "game",
        "user",
        "verdict",
        "overall_score",
        "engine_top1_rate",
        "accuracy_estimate",
    ]
    list_filter = ["verdict", "game__mode"]
    search_fields = ["user__username", "game__id"]
    readonly_fields = [
        "signals_json",
        "move_evals_json",
        "engine_top1_rate",
        "engine_top3_rate",
        "avg_centipawn_loss",
        "accuracy_estimate",
        "overall_score",
        "analyzed_at",
    ]
    ordering = ["-overall_score"]


@admin.register(FairPlayReviewCase)
class FairPlayReviewCaseAdmin(admin.ModelAdmin):
    list_display = ["id", "report", "status", "decision", "peer_score_delta", "reviewer", "created_at"]
    list_filter = ["status", "decision"]
    search_fields = ["report__user__username", "report__game__id"]
    ordering = ["-peer_score_delta"]


@admin.register(FairPlaySanction)
class FairPlaySanctionAdmin(admin.ModelAdmin):
    list_display = ["user", "sanction_type", "is_active", "until", "created_by", "created_at"]
    list_filter = ["sanction_type", "is_active"]


@admin.register(FairPlayUserConsent)
class FairPlayUserConsentAdmin(admin.ModelAdmin):
    list_display = ["user", "consent_version", "consented_at", "ip_address"]
    readonly_fields = ["consented_at", "ip_address", "user_agent"]


@admin.register(FairPlayAppeal)
class FairPlayAppealAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "review_case", "status", "created_at", "resolved_at"]
    list_filter = ["status"]


@admin.register(FairPlayAuditLog)
class FairPlayAuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "action", "staff", "target_type", "target_id", "ip_address"]
    list_filter = ["action"]
    readonly_fields = ["created_at", "action", "staff", "target_type", "target_id", "ip_address", "metadata"]


@admin.register(GameFairPlayTelemetry)
class GameFairPlayTelemetryAdmin(admin.ModelAdmin):
    list_display = ["game", "user", "updated_at"]
    search_fields = ["user__username", "game__id"]
