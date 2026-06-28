from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.permissions import IsStaffUser

from .fairplay_audit import log_fairplay_audit
from .fairplay_review import (
    apply_review_decision,
    fairplay_queue_overview,
    game_fairplay_detail,
    list_review_queue,
    resolve_fairplay_appeal,
    user_fairplay_summary,
)
from .models import FairPlayAppeal, FairPlayAuditLog


def _audit(request, action: str, target_type: str = "", target_id: str = ""):
    log_fairplay_audit(
        action=action,
        staff=request.user,
        target_type=target_type,
        target_id=target_id,
        request=request,
    )


@extend_schema(summary="Vue d'ensemble Fair Play (staff)")
class AdminFairPlayOverviewView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        _audit(request, FairPlayAuditLog.Action.VIEW_OVERVIEW)
        return Response(fairplay_queue_overview())


@extend_schema(summary="File de revue Fair Play (staff)")
class AdminFairPlayQueueView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        _audit(request, FairPlayAuditLog.Action.VIEW_QUEUE)
        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
            offset = max(int(request.query_params.get("offset", 0)), 0)
        except ValueError:
            limit, offset = 50, 0
        return Response(
            list_review_queue(
                status=request.query_params.get("status") or None,
                verdict=request.query_params.get("verdict") or None,
                limit=limit,
                offset=offset,
            )
        )


@extend_schema(summary="Détail Fair Play d'une partie — comparaison pair-à-pair (staff)")
class AdminFairPlayGameView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, game_id):
        _audit(request, FairPlayAuditLog.Action.VIEW_GAME, "game", str(game_id))
        data = game_fairplay_detail(str(game_id))
        if not data:
            return Response({"detail": "Partie introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)


@extend_schema(summary="Historique Fair Play d'un joueur (staff)")
class AdminFairPlayUserView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request, user_id: int):
        _audit(request, FairPlayAuditLog.Action.VIEW_USER, "user", str(user_id))
        data = user_fairplay_summary(user_id)
        if not data:
            return Response({"detail": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)


@extend_schema(summary="Décision de revue humaine (staff)")
class AdminFairPlayDecisionView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, case_id: int):
        body = request.data or {}
        result = apply_review_decision(
            case_id,
            request.user,
            status=body.get("status", "dismissed"),
            decision=body.get("decision", "none"),
            notes=str(body.get("notes", ""))[:2000],
            suspend_days=body.get("suspend_days"),
            request=request,
        )
        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


@extend_schema(summary="Résoudre un recours Fair Play (staff)")
class AdminFairPlayAppealResolveView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, appeal_id: int):
        body = request.data or {}
        result = resolve_fairplay_appeal(
            appeal_id,
            request.user,
            status=body.get("status", FairPlayAppeal.Status.REJECTED),
            staff_response=str(body.get("staff_response", ""))[:4000],
            request=request,
        )
        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)
