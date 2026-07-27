from django.urls import path

from . import views

urlpatterns = [
    path("active/", views.ActiveAdListView.as_view(), name="ads-active"),
    path("track/click/<int:pk>/", views.AdClickTrackView.as_view(), name="ads-track-click"),
    path("track/impressions/", views.AdImpressionTrackView.as_view(), name="ads-track-impressions"),
    path("admin/summary/", views.AdminAdsSummaryView.as_view(), name="ads-admin-summary"),
    path("admin/settings/", views.AdminAdCarouselSettingsView.as_view(), name="ads-admin-settings"),
    path("admin/slides/", views.AdminAdSlideListCreateView.as_view(), name="ads-admin-list"),
    path("admin/slides/reorder/", views.AdminAdSlideReorderView.as_view(), name="ads-admin-reorder"),
    path("admin/slides/bulk/", views.AdminAdSlideBulkView.as_view(), name="ads-admin-bulk"),
    path(
        "admin/slides/<int:pk>/duplicate/",
        views.AdminAdSlideDuplicateView.as_view(),
        name="ads-admin-duplicate",
    ),
    path(
        "admin/slides/<int:pk>/",
        views.AdminAdSlideDetailView.as_view(),
        name="ads-admin-detail",
    ),
]
