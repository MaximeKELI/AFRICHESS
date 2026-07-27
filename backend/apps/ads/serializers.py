from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from apps.common.validators import ALLOWED_IMAGE_CONTENT_TYPES

from .models import AdSlide

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


class AdSlidePublicSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = AdSlide
        fields = ["id", "title", "image_url", "link_url", "order"]

    def get_image_url(self, obj) -> str | None:
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class AdSlideAdminSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = AdSlide
        fields = [
            "id",
            "title",
            "image",
            "image_url",
            "link_url",
            "is_active",
            "order",
            "starts_at",
            "ends_at",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]
        extra_kwargs = {
            "image": {"write_only": True, "required": True},
        }

    def get_image_url(self, obj) -> str | None:
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def validate_image(self, value):
        try:
            return validate_ad_image(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)

    def validate(self, attrs):
        starts = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
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
    now = timezone.now()
    return (
        AdSlide.objects.filter(is_active=True)
        .exclude(starts_at__gt=now)
        .exclude(ends_at__lt=now)
        .order_by("order", "-created_at")
    )
