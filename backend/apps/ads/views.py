from django.db.models import F
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.permissions import IsStaffUser

from .models import AdCarouselSettings, AdSlide
from .serializers import (
    AdCarouselSettingsSerializer,
    AdSlideAdminSerializer,
    AdSlideAdminUpdateSerializer,
    AdSlidePublicSerializer,
    active_ads_queryset,
    ads_summary,
)


class ActiveAdListView(APIView):
    """Liste publique des pubs actives + réglages carrousel."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(responses={200: dict})
    def get(self, request):
        settings = AdCarouselSettings.get_solo()
        qs = active_ads_queryset()
        return Response(
            {
                "settings": AdCarouselSettingsSerializer(settings).data,
                "slides": AdSlidePublicSerializer(
                    qs, many=True, context={"request": request}
                ).data,
            }
        )


class AdClickTrackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, pk):
        updated = AdSlide.objects.filter(pk=pk).update(click_count=F("click_count") + 1)
        if not updated:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response({"ok": True})


class AdImpressionTrackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ids = request.data.get("ids")
        if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
            return Response(
                {"detail": "ids doit être une liste d'entiers."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if ids:
            AdSlide.objects.filter(pk__in=ids).update(
                impression_count=F("impression_count") + 1
            )
        return Response({"ok": True, "count": len(ids)})


class AdminAdSlideListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = AdSlide.objects.all().select_related("created_by")
    serializer_class = AdSlideAdminSerializer
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminAdSlideDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaffUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = AdSlide.objects.all().select_related("created_by")
    http_method_names = ["get", "patch", "put", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdSlideAdminUpdateSerializer
        return AdSlideAdminSerializer


class AdminAdSlideReorderView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(request={"application/json": {"type": "object"}}, responses={200: dict})
    def post(self, request):
        ids = request.data.get("order")
        if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
            return Response(
                {"detail": "order doit être une liste d'entiers (ids)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        slides = {s.id: s for s in AdSlide.objects.filter(id__in=ids)}
        updated = []
        for index, slide_id in enumerate(ids):
            slide = slides.get(slide_id)
            if not slide:
                continue
            if slide.order != index:
                slide.order = index
                updated.append(slide)
        if updated:
            AdSlide.objects.bulk_update(updated, ["order"])
        return Response({"ok": True, "count": len(ids)})


class AdminAdSlideBulkView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request):
        action = request.data.get("action")
        ids = request.data.get("ids")
        if action not in {"activate", "deactivate", "delete"}:
            return Response(
                {"detail": "action doit être activate, deactivate ou delete."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
            return Response(
                {"detail": "ids doit être une liste d'entiers."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = AdSlide.objects.filter(id__in=ids)
        if action == "delete":
            deleted, _ = qs.delete()
            return Response({"ok": True, "deleted": deleted})
        updated = qs.update(is_active=(action == "activate"))
        return Response({"ok": True, "updated": updated})


class AdminAdSlideDuplicateView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        src = get_object_or_404(AdSlide, pk=pk)
        max_order = AdSlide.objects.order_by("-order").values_list("order", flat=True).first() or 0
        clone = AdSlide(
            title=f"{src.title} (copie)",
            alt_text=src.alt_text,
            link_url=src.link_url,
            open_in_new_tab=src.open_in_new_tab,
            sponsor_label=src.sponsor_label,
            notes=src.notes,
            is_active=False,
            order=max_order + 1,
            duration_ms=src.duration_ms,
            starts_at=src.starts_at,
            ends_at=src.ends_at,
            created_by=request.user,
        )
        if src.image:
            clone.image = src.image
        clone.save()
        return Response(
            AdSlideAdminSerializer(clone, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminAdsSummaryView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(ads_summary())


class AdminAdCarouselSettingsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        settings = AdCarouselSettings.get_solo()
        return Response(AdCarouselSettingsSerializer(settings).data)

    def patch(self, request):
        settings = AdCarouselSettings.get_solo()
        ser = AdCarouselSettingsSerializer(settings, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
