"""Signalement joueur et calendrier événements."""

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Game
from apps.social.relationships import is_blocked

from .models import PlatformEvent, PlayerReport

User = get_user_model()


class ReportPlayerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        category = (request.data.get("category") or "other").strip()
        description = (request.data.get("description") or "").strip()[:2000]
        game_id = request.data.get("game_id")

        if category not in dict(PlayerReport.Category.choices):
            return Response({"error": "Catégorie invalide"}, status=400)
        try:
            reported = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "Utilisateur introuvable"}, status=404)
        if reported.id == request.user.id:
            return Response({"error": "Action non autorisée"}, status=400)
        if is_blocked(request.user, reported):
            return Response({"error": "Action non autorisée"}, status=403)

        game = None
        if game_id:
            try:
                game = Game.objects.get(pk=game_id)
            except Game.DoesNotExist:
                pass

        report = PlayerReport.objects.create(
            reporter=request.user,
            reported_user=reported,
            game=game,
            category=category,
            description=description,
        )

        return Response(
            {"ok": True, "report_id": report.id, "status": report.status},
            status=status.HTTP_201_CREATED,
        )


class PlatformEventListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = timezone.now()
        qs = PlatformEvent.objects.filter(starts_at__gte=now - timezone.timedelta(days=1)).order_by(
            "starts_at"
        )[:50]
        data = [
            {
                "id": e.id,
                "title": e.title,
                "description": e.description,
                "event_type": e.event_type,
                "starts_at": e.starts_at.isoformat(),
                "ends_at": e.ends_at.isoformat() if e.ends_at else None,
                "url_path": e.url_path,
                "is_featured": e.is_featured,
            }
            for e in qs
        ]
        return Response(data)
