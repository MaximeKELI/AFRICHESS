from django.urls import path

from .views import (
    AdminOverviewView,
    AdminRegistrationsView,
    AdminUserDetailView,
    AdminUsersListView,
    EventIngestView,
)

urlpatterns = [
    path("events/", EventIngestView.as_view(), name="analytics-events"),
    path("admin/overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("admin/registrations/", AdminRegistrationsView.as_view(), name="admin-registrations"),
    path("admin/users/", AdminUsersListView.as_view(), name="admin-users"),
    path("admin/users/<int:user_id>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
]
