from django.urls import path

from . import views

urlpatterns = [
    path("active/", views.ActiveAdListView.as_view(), name="ads-active"),
    path("admin/slides/", views.AdminAdSlideListCreateView.as_view(), name="ads-admin-list"),
    path(
        "admin/slides/reorder/",
        views.AdminAdSlideReorderView.as_view(),
        name="ads-admin-reorder",
    ),
    path(
        "admin/slides/<int:pk>/",
        views.AdminAdSlideDetailView.as_view(),
        name="ads-admin-detail",
    ),
]
