from django.urls import path

from . import views

urlpatterns = [
    path("", views.TournamentListView.as_view(), name="tournament-list"),
    path("<slug:slug>/", views.TournamentDetailView.as_view(), name="tournament-detail"),
    path("<slug:slug>/register/", views.RegisterTournamentView.as_view(), name="tournament-register"),
]
