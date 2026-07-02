from django.urls import path

from . import views

urlpatterns = [
    path("daily/", views.DailyPuzzleView.as_view(), name="daily-puzzle"),
    path("themes/", views.PuzzleThemesView.as_view(), name="puzzle-themes"),
    path("training/", views.TacticalTrainingView.as_view(), name="tactical-training"),
    path("rush/", views.PuzzleRushView.as_view(), name="puzzle-rush"),
    path("rush/start/", views.PuzzleRushStartView.as_view(), name="puzzle-rush-start"),
    path("rush/<int:session_id>/submit/", views.PuzzleRushSubmitView.as_view(), name="puzzle-rush-submit"),
    path("storm/start/", views.PuzzleStormStartView.as_view(), name="puzzle-storm-start"),
    path("storm/<int:session_id>/submit/", views.PuzzleStormSubmitView.as_view(), name="puzzle-storm-submit"),
    path("survival/start/", views.PuzzleSurvivalStartView.as_view(), name="puzzle-survival-start"),
    path("survival/<int:session_id>/submit/", views.PuzzleSurvivalSubmitView.as_view(), name="puzzle-survival-submit"),
    path("rush/leaderboard/", views.PuzzleRushLeaderboardView.as_view(), name="puzzle-rush-leaderboard"),
    path("battle/queue/", views.PuzzleBattleQueueView.as_view(), name="puzzle-battle-queue"),
    path("battle/<int:battle_id>/", views.PuzzleBattleDetailView.as_view(), name="puzzle-battle-detail"),
    path("custom/", views.CustomPuzzleCreateView.as_view(), name="puzzle-custom"),
    path("streak/", views.PuzzleStreakView.as_view(), name="puzzle-streak"),
    path("leaderboard/", views.PuzzleLeaderboardView.as_view(), name="puzzle-leaderboard"),
    path("", views.PuzzleListView.as_view(), name="puzzle-list"),
    path("<int:pk>/", views.PuzzleDetailView.as_view(), name="puzzle-detail"),
    path("<int:pk>/submit/", views.SubmitPuzzleView.as_view(), name="puzzle-submit"),
]
