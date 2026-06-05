from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .stats_service import build_user_stats_payload


@extend_schema(summary="Statistiques détaillées des parties du joueur connecté")
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_game_stats(request):
    return Response(build_user_stats_payload(request.user))
