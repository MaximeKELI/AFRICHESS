from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from apps.common.validators import ALLOWED_IMAGE_CONTENT_TYPES

from .models import AdCarouselSettings, AdSlide

MAX_AD_IMAGE_BYTES = 5 * 1024 * 1024


def validate_ad_image(upload):
    if not upload:
        return upload
    if upload.size > MAX_AD_IMAGE_BYTES:
        raise serializers.ValidationError("Fichier trop volumineux (max 5 Mo).")
    content_type = getattr(upload, "content_type", "") or ""
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise serializers.ValidationError(
            "Format d'image non autorisé (JPEG, PNG, WebP, GIF)."
        )
    return upload


def _image_url(obj, request) -> str | None:
    if not obj.image:
        return None
    url = obj.image.url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


class AdCarouselSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdCarouselSettings
        fields = [
            "enabled",
            "default_duration_ms",
            "pause_on_hover",
            "show_dots",
            "show_arrows",
            "max_height_px",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate_default_duration_ms(self, value):
        if value < 2000 or value > 60000:
            raise serializers.ValidationError("Durée entre 2000 et 60000 ms.")
        return value

    def validate_max_height_px(self, value):
        if value < 60 or value > 400:
            raise serializers.ValidationError("Hauteur entre 60 et 400 px.")
        return value


class AdSlidePublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    alt = serializers.SerializerMethodField()

    class Meta:
        model = AdSlide
        fields = [
            "id",
            "title",
            "alt",
            "image_url",
            "link_url",
            "open_in_new_tab",
            "sponsor_label",
            "duration_ms",
            "order",
        ]

    def get_image_url(self, obj) -> str | None:
        return _image_url(obj, self.context.get("request"))

    def get_alt(self, obj) -> str:
        return (obj.alt_text or obj.title or "").strip()


class AdSlideAdminSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, allow_null=True
    )
    schedule_status = serializers.SerializerMethodField(read_only=True)
    is_live = serializers.SerializerMethodField(read_only=True)
    clear_schedule = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = AdSlide
        fields = [
            "id",
            "title",
            "alt_text",
            "image",
            "image_url",
            "link_url",
            "open_in_new_tab",
            "sponsor_label",
            "notes",
            "is_active",
            "order",
            "duration_ms",
            "starts_at",
            "ends_at",
            "clear_schedule",
            "click_count",
            "impression_count",
            "schedule_status",
            "is_live",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_by",
            "created_at",
            "updated_at",
            "click_count",
            "impression_count",
        ]
        extra_kwargs = {
            "image": {"write_only": True, "required": True},
        }

    def get_image_url(self, obj) -> str | None:
        return _image_url(obj, self.context.get("request"))

    def get_schedule_status(self, obj) -> str:
        return obj.schedule_status

    def get_is_live(self, obj) -> bool:
        return obj.is_currently_visible()

    def validate_image(self, value):
        try:
            return validate_ad_image(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)

    def validate_duration_ms(self, value):
        if value is None:
            return value
        if value < 2000 or value > 60000:
            raise serializers.ValidationError("Durée entre 2000 et 60000 ms.")
        return value

    def validate(self, attrs):
        clear = attrs.pop("clear_schedule", False)
        if clear:
            attrs["starts_at"] = None
            attrs["ends_at"] = None
        starts = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if clear:
            starts = ends = None
        if starts and ends and ends < starts:
            raise serializers.ValidationError(
                {"ends_at": "La fin doit être après le début."}
            )
        return attrs


class AdSlideAdminUpdateSerializer(AdSlideAdminSerializer):
    class Meta(AdSlideAdminSerializer.Meta):
        extra_kwargs = {
            "image": {"write_only": True, "required": False},
        }


def active_ads_queryset():
    settings = AdCarouselSettings.get_solo()
    if not settings.enabled:
        return AdSlide.objects.none()
    now = timezone.now()
    return (
        AdSlide.objects.filter(is_active=True)
        .exclude(starts_at__gt=now)
        .exclude(ends_at__lt=now)
        .order_by("order", "-created_at")
    )


def ads_summary():
    now = timezone.now()
    qs = AdSlide.objects.all()
    active = qs.filter(is_active=True)
    live = (
        active.exclude(starts_at__gt=now)
        .exclude(ends_at__lt=now)
    )
    scheduled = active.filter(starts_at__gt=now)
    expired = active.filter(ends_at__lt=now)
    aggregates = qs.aggregate(
        clicks=Sum("click_count"),
        impressions=Sum("impression_count"),
    )
    settings = AdCarouselSettings.get_solo()
    return {
        "total": qs.count(),
        "active": active.count(),
        "inactive": qs.filter(is_active=False).count(),
        "live": live.count(),
        "scheduled": scheduled.count(),
        "expired": expired.count(),
        "clicks": aggregates["clicks"] or 0,
        "impressions": aggregates["impressions"] or 0,
        "carousel_enabled": settings.enabled,
    }
