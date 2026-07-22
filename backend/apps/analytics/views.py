from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from .admin_intelligence import (
    TABLE_NAMES,
    catalog,
    data_science_report,
    statistics_and_probability,
    table_rows,
    update_user_powers,
)
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


@extend_schema(summary="Catalogue des tables admin")
class AdminTablesCatalogView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response(catalog())


@extend_schema(summary="Lignes d'une table admin (paginé)")
class AdminTableRowsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, table_name: str):
        if table_name not in TABLE_NAMES:
            return Response({"detail": "Table inconnue."}, status=status.HTTP_404_NOT_FOUND)
        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except ValueError:
            limit, offset = 50, 0
        try:
            return Response(
                table_rows(
                    table_name,
                    q=request.query_params.get("q", ""),
                    limit=limit,
                    offset=offset,
                )
            )
        except Exception as exc:  # noqa: BLE001
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(summary="Statistiques et probabilités plateforme")
class AdminStatsProbabilityView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 30))
        except ValueError:
            days = 30
        return Response(statistics_and_probability(days=days))


@extend_schema(summary="Analyse data science (cohortes, funnel, rétention)")
class AdminDataScienceView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 60))
        except ValueError:
            days = 60
        return Response(data_science_report(days=days))


@extend_schema(summary="Pouvoirs admin sur un utilisateur")
class AdminUserPowersView(APIView):
    permission_classes = [IsStaffUser]

    def patch(self, request, user_id: int):
        try:
            result = update_user_powers(actor=request.user, user_id=user_id, payload=request.data)
            return Response(result)
        except LookupError:
            return Response({"detail": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
