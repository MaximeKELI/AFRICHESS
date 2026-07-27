from django.contrib import admin

from .models import AdCarouselSettings, AdSlide


@admin.register(AdSlide)
class AdSlideAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "is_active",
        "order",
        "duration_ms",
        "click_count",
        "impression_count",
        "starts_at",
        "ends_at",
        "updated_at",
    )
    list_filter = ("is_active", "open_in_new_tab")
    search_fields = ("title", "link_url", "sponsor_label", "notes")
    ordering = ("order", "-created_at")
    readonly_fields = (
        "created_at",
        "updated_at",
        "created_by",
        "click_count",
        "impression_count",
    )


@admin.register(AdCarouselSettings)
class AdCarouselSettingsAdmin(admin.ModelAdmin):
    list_display = ("enabled", "default_duration_ms", "pause_on_hover", "updated_at")
    readonly_fields = ("updated_at",)

    def has_add_permission(self, request):
        return not AdCarouselSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
