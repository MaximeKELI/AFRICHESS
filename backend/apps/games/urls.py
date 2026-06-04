from django.urls import path

from . import views

urlpatterns = [
    path("", views.GameListView.as_view(), name="game-list"),
    path("ai/", views.CreateAIGameView.as_view(), name="create-ai-game"),
    path("ai/preview/", views.ai_strength_preview, name="ai-strength-preview"),
    path("matchmaking/", views.MatchmakingView.as_view(), name="matchmaking"),
    path("engine/eval/", views.engine_eval, name="engine-eval"),
    path("<uuid:id>/", views.GameDetailView.as_view(), name="game-detail"),
    path("<uuid:game_id>/move/", views.MakeMoveView.as_view(), name="game-move"),
    path("<uuid:game_id>/analyze/", views.AnalyzeGameView.as_view(), name="game-analyze"),
]
