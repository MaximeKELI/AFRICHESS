from django.urls import path

from . import views

urlpatterns = [
    path("daily/", views.DailyPuzzleView.as_view(), name="daily-puzzle"),
    path("training/", views.TacticalTrainingView.as_view(), name="tactical-training"),
    path("rush/", views.PuzzleRushView.as_view(), name="puzzle-rush"),
    path("leaderboard/", views.PuzzleLeaderboardView.as_view(), name="puzzle-leaderboard"),
    path("", views.PuzzleListView.as_view(), name="puzzle-list"),
    path("<int:pk>/", views.PuzzleDetailView.as_view(), name="puzzle-detail"),
    path("<int:pk>/submit/", views.SubmitPuzzleView.as_view(), name="puzzle-submit"),
]
