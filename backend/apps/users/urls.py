from django.urls import path

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("<str:username>/", views.UserDetailView.as_view(), name="user-detail"),
    path("featured/african/", views.AfricanPlayersView.as_view(), name="african-players"),
    path("meta/countries/", views.countries_list, name="countries"),
]
