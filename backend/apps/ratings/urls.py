from django.urls import path

from . import views

urlpatterns = [
    path("me/", views.MyRatingsView.as_view(), name="my-ratings"),
    path("history/", views.RatingHistoryView.as_view(), name="rating-history"),
    path("leaderboard/global/", views.GlobalLeaderboardView.as_view(), name="global-leaderboard"),
    path("leaderboard/african/", views.AfricanLeaderboardView.as_view(), name="african-leaderboard"),
    path("leaderboard/country/<str:country_code>/", views.CountryLeaderboardView.as_view(), name="country-leaderboard"),
    path("user/<str:username>/", views.UserRatingsView.as_view(), name="user-ratings"),
]
