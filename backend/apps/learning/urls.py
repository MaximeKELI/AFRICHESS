from django.urls import path

from . import level3_views, views

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
    path("insights/", level3_views.InsightsView.as_view(), name="learning-insights"),
    path("videos/", level3_views.VideoListView.as_view(), name="learning-videos"),
    path("repertoires/", level3_views.RepertoireListCreateView.as_view(), name="learning-repertoires"),
    path(
        "repertoires/<int:rep_id>/lines/",
        level3_views.RepertoireLineView.as_view(),
        name="learning-repertoire-lines",
    ),
    path(
        "repertoires/<int:rep_id>/lines/<int:line_id>/",
        level3_views.RepertoireLineView.as_view(),
        name="learning-repertoire-line-delete",
    ),
    path("study/", level3_views.StudyLineListCreateView.as_view(), name="learning-study"),
    path("study/review/", level3_views.StudyReviewView.as_view(), name="learning-study-review"),
    path("study/<int:line_id>/review/", level3_views.StudyReviewView.as_view(), name="learning-study-submit"),
    path("classroom/", level3_views.ClassroomListCreateView.as_view(), name="learning-classroom"),
    path("classroom/<str:code>/", level3_views.ClassroomDetailView.as_view(), name="learning-classroom-detail"),
]
