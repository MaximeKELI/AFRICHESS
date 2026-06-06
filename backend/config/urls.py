from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny, IsAdminUser

_doc_permissions = [AllowAny] if settings.DEBUG else [IsAdminUser]

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
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
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
