from django.urls import path

from .views import (
    AdminDataScienceView,
    AdminOverviewView,
    AdminRegistrationsView,
    AdminStatsProbabilityView,
    AdminTableRowsView,
    AdminTablesCatalogView,
    AdminUserDetailView,
    AdminUserPowersView,
    AdminUsersListView,
    EventIngestView,
)

urlpatterns = [
    path("events/", EventIngestView.as_view(), name="analytics-events"),
    path("admin/overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("admin/registrations/", AdminRegistrationsView.as_view(), name="admin-registrations"),
    path("admin/users/", AdminUsersListView.as_view(), name="admin-users"),
    path("admin/users/<int:user_id>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path(
        "admin/users/<int:user_id>/powers/",
        AdminUserPowersView.as_view(),
        name="admin-user-powers",
    ),
    path("admin/tables/", AdminTablesCatalogView.as_view(), name="admin-tables-catalog"),
    path("admin/tables/<str:table_name>/", AdminTableRowsView.as_view(), name="admin-table-rows"),
    path("admin/stats/", AdminStatsProbabilityView.as_view(), name="admin-stats"),
    path("admin/data-science/", AdminDataScienceView.as_view(), name="admin-data-science"),
]
