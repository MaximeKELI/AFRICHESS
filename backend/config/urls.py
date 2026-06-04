from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger"),
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/games/", include("apps.games.urls")),
    path("api/ratings/", include("apps.ratings.urls")),
    path("api/puzzles/", include("apps.puzzles.urls")),
    path("api/social/", include("apps.social.urls")),
    path("api/tournaments/", include("apps.tournaments.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
