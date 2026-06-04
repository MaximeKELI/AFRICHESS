from django.contrib import admin

from .models import Tournament, TournamentRound


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ["name", "format", "status", "is_african_cup", "starts_at"]
    list_filter = ["status", "is_african_cup", "format"]


@admin.register(TournamentRound)
class TournamentRoundAdmin(admin.ModelAdmin):
    list_display = ["tournament", "round_number"]
