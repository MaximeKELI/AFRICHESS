from django.urls import path

from apps.games.stats_views import my_game_stats

urlpatterns = [
    path("me/", my_game_stats, name="my-game-stats"),
]
