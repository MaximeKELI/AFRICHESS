from django.urls import path

from . import account_lifecycle, totp_views, views
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
    path("subscription/billing-portal/", views.subscription_billing_portal, name="subscription-billing-portal"),
    path("subscription/webhook/", views.stripe_webhook, name="stripe-webhook"),
    path("security/2fa/status/", totp_views.TotpStatusView.as_view(), name="totp-status"),
    path("security/2fa/setup/", totp_views.TotpSetupView.as_view(), name="totp-setup"),
    path("security/2fa/enable/", totp_views.TotpEnableView.as_view(), name="totp-enable"),
    path("security/2fa/disable/", totp_views.TotpDisableView.as_view(), name="totp-disable"),
    path(
        "account/export/",
        account_lifecycle.ExportAccountDataView.as_view(),
        name="account-export",
    ),
    path(
        "account/close/",
        account_lifecycle.CloseAccountView.as_view(),
        name="account-close",
    ),
    path("<str:username>/", views.UserDetailView.as_view(), name="user-detail"),
]
