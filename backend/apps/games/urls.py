from django.urls import path

from . import views

urlpatterns = [
    path("", views.GameListView.as_view(), name="game-list"),
    path("ai/", views.CreateAIGameView.as_view(), name="create-ai-game"),
    path("ai/preview/", views.ai_strength_preview, name="ai-strength-preview"),
    path("active/", views.active_games, name="active-games"),
    path("matchmaking/", views.MatchmakingView.as_view(), name="matchmaking"),
    path("live/", views.LiveGamesView.as_view(), name="live-games"),
    path("correspondence/", views.CorrespondenceListView.as_view(), name="correspondence-list"),
    path("correspondence/challenge/", views.CorrespondenceChallengeView.as_view(), name="correspondence-challenge"),
    path("openings/lookup/", views.opening_lookup, name="opening-lookup"),
    path("engine/eval/", views.engine_eval, name="engine-eval"),
    path("<uuid:id>/", views.GameDetailView.as_view(), name="game-detail"),
    path("<uuid:game_id>/move/", views.MakeMoveView.as_view(), name="game-move"),
    path("<uuid:game_id>/undo/", views.UndoMoveView.as_view(), name="game-undo"),
    path("<uuid:game_id>/analyze/", views.AnalyzeGameView.as_view(), name="game-analyze"),
    path("<uuid:game_id>/draw/", views.DrawOfferView.as_view(), name="game-draw-offer"),
    path("<uuid:game_id>/draw/respond/", views.DrawRespondView.as_view(), name="game-draw-respond"),
    path("<uuid:game_id>/rematch/", views.RematchView.as_view(), name="game-rematch"),
]
