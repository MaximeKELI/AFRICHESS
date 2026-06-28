from django.urls import path

from . import views
from apps.social.views import UserSearchView

urlpatterns = [
    path("auth/oauth/exchange/", views.oauth_exchange, name="oauth-exchange"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("vacation/", views.vacation_mode, name="vacation-mode"),
    path("search/", UserSearchView.as_view(), name="users-search"),
    path("featured/african/", views.AfricanPlayersView.as_view(), name="african-players"),
    path("meta/countries/", views.countries_list, name="countries"),
    path("subscription/plans/", views.subscription_plans, name="subscription-plans"),
    path("subscription/status/", views.subscription_status, name="subscription-status"),
    path("subscription/subscribe/", views.subscription_subscribe, name="subscription-subscribe"),
    path("subscription/webhook/", views.stripe_webhook, name="stripe-webhook"),
    path("<str:username>/", views.UserDetailView.as_view(), name="user-detail"),
]
