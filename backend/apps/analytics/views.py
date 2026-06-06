from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from .events import log_events_batch
from .permissions import IsStaffUser
from .serializers import ActivityBatchSerializer
from .services import (
    list_users_admin,
    platform_overview,
    registration_breakdown,
    user_activity_summary,
    user_timeline,
)


class EventIngestThrottle(UserRateThrottle):
    rate = "120/min"


class EventIngestAnonThrottle(AnonRateThrottle):
    rate = "30/min"


@extend_schema(summary="Ingestion batch d'événements (clics, pages, etc.)")
class EventIngestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EventIngestThrottle, EventIngestAnonThrottle]

    def post(self, request):
        serializer = ActivityBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user if request.user.is_authenticated else None
        count = log_events_batch(serializer.validated_data["events"], user=user, request=request)
        return Response({"recorded": count}, status=status.HTTP_201_CREATED)


@extend_schema(summary="Vue d'ensemble admin (staff)")
class AdminOverviewView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(platform_overview())


@extend_schema(summary="Répartition des inscriptions (staff)")
class AdminRegistrationsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(registration_breakdown())


@extend_schema(summary="Liste utilisateurs avec activité (staff)")
class AdminUsersListView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        search = request.query_params.get("q", "")
        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except ValueError:
            limit, offset = 50, 0
        return Response(list_users_admin(search=search, limit=limit, offset=offset))


@extend_schema(summary="Détail activité d'un utilisateur (staff)")
class AdminUserDetailView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, user_id: int):
        summary = user_activity_summary(user_id)
        if summary is None:
            return Response({"detail": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        try:
            limit = min(int(request.query_params.get("limit", 100)), 500)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except ValueError:
            limit, offset = 100, 0
        timeline = user_timeline(user_id, limit=limit, offset=offset)
        return Response({**summary, "timeline": timeline})
