from django.urls import path

from . import views

urlpatterns = [
    path("", views.TournamentListView.as_view(), name="tournament-list"),
    path("<slug:slug>/", views.TournamentDetailView.as_view(), name="tournament-detail"),
    path("<slug:slug>/register/", views.RegisterTournamentView.as_view(), name="tournament-register"),
    path("<slug:slug>/start/", views.StartTournamentView.as_view(), name="tournament-start"),
    path("<slug:slug>/standings/", views.TournamentStandingsView.as_view(), name="tournament-standings"),
    path("<slug:slug>/my-game/", views.MyTournamentGameView.as_view(), name="tournament-my-game"),
]
