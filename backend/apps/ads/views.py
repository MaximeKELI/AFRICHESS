from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.permissions import IsStaffUser

from .models import AdSlide
from .serializers import (
    AdSlideAdminSerializer,
    AdSlideAdminUpdateSerializer,
    AdSlidePublicSerializer,
    active_ads_queryset,
)


class ActiveAdListView(APIView):
    """Liste publique des pubs actives pour le carrousel bas de page."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(responses=AdSlidePublicSerializer(many=True))
    def get(self, request):
        qs = active_ads_queryset()
        return Response(
            AdSlidePublicSerializer(qs, many=True, context={"request": request}).data
        )


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
        """Body: { "order": [id1, id2, ...] } — définit l'ordre d'affichage."""
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
