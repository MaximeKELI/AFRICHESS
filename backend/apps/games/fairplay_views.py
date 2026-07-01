"""API Fair Play joueur — consentement RGPD, statut, recours."""

from __future__ import annotations

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .fairplay_exempt import user_is_fairplay_exempt
from .fairplay_review import (
    resolve_fairplay_appeal,
    submit_fairplay_appeal,
    user_fairplay_restrictions,
)
from .fairplay_telemetry import user_has_fairplay_consent
from .models import FairPlayAppeal, FairPlayReviewCase, FairPlayUserConsent


def _client_meta(request) -> tuple[str | None, str]:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    ip = forwarded.split(",")[0].strip()[:45] if forwarded else (request.META.get("REMOTE_ADDR") or "")[:45]
    ua = (request.META.get("HTTP_USER_AGENT") or "")[:512]
    return ip or None, ua


@extend_schema(summary="Statut Fair Play du joueur connecté")
class FairPlayStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        exempt = user_is_fairplay_exempt(user)
        restrictions = user_fairplay_restrictions(user)
        appeals = FairPlayAppeal.objects.filter(user=user).order_by("-created_at")[:5]
        pending_cases = FairPlayReviewCase.objects.filter(
            report__user=user,
            status__in=(
                FairPlayReviewCase.Status.CONFIRMED,
                FairPlayReviewCase.Status.ESCALATED,
            ),
        ).select_related("report__game")[:10]
        return Response(
            {
                "exempt": exempt,
                "consent_given": exempt or user_has_fairplay_consent(user),
                "consent_version": FairPlayUserConsent.CONSENT_VERSION,
                "restrictions": restrictions,
                "appealable_cases": pending_cases.count(),
                "review_cases": [
                    {
                        "id": c.id,
                        "game_id": str(c.report.game_id) if c.report.game_id else None,
                        "verdict": c.report.verdict,
                        "status": c.status,
                    }
                    for c in pending_cases
                ],
                "recent_appeals": [
                    {
                        "id": a.id,
                        "status": a.status,
                        "created_at": a.created_at.isoformat(),
                        "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
                    }
                    for a in appeals
                ],
            }
        )


@extend_schema(summary="Consentement Fair Play (RGPD Art. 6/13)")
class FairPlayConsentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ip, ua = _client_meta(request)
        consent, created = FairPlayUserConsent.objects.update_or_create(
            user=request.user,
            defaults={
                "consent_version": FairPlayUserConsent.CONSENT_VERSION,
                "consented_at": timezone.now(),
                "ip_address": ip,
                "user_agent": ua,
            },
        )
        return Response(
            {
                "ok": True,
                "created": created,
                "consent_version": consent.consent_version,
                "consented_at": consent.consented_at.isoformat(),
            }
        )

    def delete(self, request):
        FairPlayUserConsent.objects.filter(user=request.user).delete()
        return Response({"ok": True, "consent_given": False})


@extend_schema(summary="Soumettre un recours Fair Play")
class FairPlayAppealView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        body = request.data or {}
        case_id = body.get("case_id")
        reason = str(body.get("reason", "")).strip()
        if not case_id or not reason:
            return Response(
                {"error": "case_id and reason required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = submit_fairplay_appeal(request.user, int(case_id), reason)
        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_201_CREATED)
