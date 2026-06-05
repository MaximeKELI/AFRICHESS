from django.contrib import admin
from django.db.models import Count

from .models import UserActivityEvent


@admin.register(UserActivityEvent)
class UserActivityEventAdmin(admin.ModelAdmin):
    list_display = ["created_at", "event_type", "user", "path", "element", "label", "session_id"]
    list_filter = ["event_type", "created_at"]
    search_fields = ["user__username", "path", "element", "label", "session_id"]
    readonly_fields = [
        "user",
        "session_id",
        "event_type",
        "path",
        "element",
        "label",
        "metadata",
        "ip_hash",
        "user_agent",
        "created_at",
    ]
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["event_type_counts"] = list(
            UserActivityEvent.objects.values("event_type")
            .annotate(c=Count("id"))
            .order_by("-c")[:10]
        )
        return super().changelist_view(request, extra_context=extra_context)
