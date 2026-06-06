from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from dj_rest_auth.views import (
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetView,
    UserDetailsView,
)
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from apps.users.auth_views import SecureLoginView, SecureLogoutView
from apps.users.views import registration_deprecated

if settings.DEBUG and getattr(settings, "ALLOW_PUBLIC_API_DOCS", False):
    _doc_permissions = [AllowAny]
else:
    _doc_permissions = [IsAdminUser]

urlpatterns = [
    path("accounts/", include("allauth.urls")),
    path("admin/", admin.site.urls),
    path(
        "api/schema/",
        SpectacularAPIView.as_view(permission_classes=_doc_permissions),
        name="schema",
    ),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema", permission_classes=_doc_permissions
        ),
        name="swagger",
    ),
    path("api/auth/login/", SecureLoginView.as_view(), name="rest_login"),
    path("api/auth/logout/", SecureLogoutView.as_view(), name="rest_logout"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("api/auth/user/", UserDetailsView.as_view(), name="rest_user_details"),
    path("api/auth/password/reset/", PasswordResetView.as_view(), name="rest_password_reset"),
    path(
        "api/auth/password/reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="rest_password_reset_confirm",
    ),
    path("api/auth/password/change/", PasswordChangeView.as_view(), name="rest_password_change"),
    path("api/auth/registration/", registration_deprecated, name="rest_register_deprecated"),
    path("api/users/", include("apps.users.urls")),
    path("api/games/", include("apps.games.urls")),
    path("api/ratings/", include("apps.ratings.urls")),
    path("api/puzzles/", include("apps.puzzles.urls")),
    path("api/social/", include("apps.social.urls")),
    path("api/tournaments/", include("apps.tournaments.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/learning/", include("apps.learning.urls")),
    path("api/stats/", include("apps.stats_urls")),
    path("api/analytics/", include("apps.analytics.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
