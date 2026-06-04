from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.DashboardView.as_view(), name="learning-dashboard"),
    path("profile/", views.LearningProfileView.as_view(), name="learning-profile"),
    path("coach/", views.CoachTipsView.as_view(), name="learning-coach"),
    path("analyze/", views.AnalyzePgnView.as_view(), name="learning-analyze-pgn"),
    path("courses/", views.CourseListView.as_view(), name="learning-courses"),
    path("courses/<slug:slug>/", views.CourseDetailView.as_view(), name="learning-course-detail"),
    path(
        "courses/<slug:slug>/complete-lesson/",
        views.CompleteLessonView.as_view(),
        name="learning-complete-lesson",
    ),
    path("lessons/<int:pk>/", views.LessonDetailView.as_view(), name="learning-lesson"),
    path("quizzes/<int:pk>/", views.QuizDetailView.as_view(), name="learning-quiz"),
    path("quizzes/<int:pk>/submit/", views.SubmitQuizView.as_view(), name="learning-quiz-submit"),
    path("puzzles/daily/", views.DailyPuzzleView.as_view(), name="learning-puzzle-daily"),
    path("puzzles/adaptive/", views.AdaptivePuzzlesView.as_view(), name="learning-puzzle-adaptive"),
    path(
        "puzzles/<int:pk>/attempt/",
        views.SubmitPuzzleAttemptView.as_view(),
        name="learning-puzzle-attempt",
    ),
    path("badges/", views.BadgeListView.as_view(), name="learning-badges"),
    path("badges/mine/", views.MyBadgesView.as_view(), name="learning-my-badges"),
    path("progress/", views.MyProgressView.as_view(), name="learning-progress"),
]
