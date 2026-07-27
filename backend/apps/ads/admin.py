from django.contrib import admin

from .models import AdSlide


@admin.register(AdSlide)
class AdSlideAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "order", "starts_at", "ends_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("title", "link_url")
    ordering = ("order", "-created_at")
    readonly_fields = ("created_at", "updated_at", "created_by")
