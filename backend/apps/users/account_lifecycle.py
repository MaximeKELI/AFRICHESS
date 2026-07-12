"""Cycle de vie compte — export RGPD + fermeture."""

from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Game
from apps.social.models import Friendship, UserFollow

from .serializers import UserSerializer


class ExportAccountDataView(APIView):
    """Export JSON des données personnelles (RGPD)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = UserSerializer(user).data
        profile.pop("totp_secret", None)
        games_qs = Game.objects.filter(Q(white_player=user) | Q(black_player=user))
        games = games_qs.order_by("-created_at")[:500]
        game_rows = [
            {
                "id": str(g.id),
                "mode": g.mode,
                "status": g.status,
                "result": g.result,
                "created_at": g.created_at.isoformat() if g.created_at else None,
                "ended_at": g.ended_at.isoformat() if g.ended_at else None,
            }
            for g in games
        ]
        return Response(
            {
                "exported_at": timezone.now().isoformat(),
                "profile": profile,
                "game_count": games_qs.count(),
                "games": game_rows,
                "friends_count": Friendship.objects.filter(
                    Q(from_user=user) | Q(to_user=user),
                    status=Friendship.Status.ACCEPTED,
                ).count(),
                "following_count": UserFollow.objects.filter(follower=user).count(),
                "followers_count": UserFollow.objects.filter(following=user).count(),
            }
        )


class CloseAccountView(APIView):
    """Fermeture de compte (soft-delete + anonymisation)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get("password") or ""
        confirm = (request.data.get("confirm") or "").strip()
        if confirm != "DELETE":
            return Response(
                {"error": 'Confirmez avec confirm="DELETE"'},
                status=400,
            )
        if not request.user.check_password(password):
            return Response({"error": "Mot de passe incorrect"}, status=400)
        if request.user.is_superuser:
            return Response(
                {"error": "Un superutilisateur ne peut pas être fermé ainsi"},
                status=400,
            )

        user = request.user
        uid = user.id
        try:
            from rest_framework_simplejwt.token_blacklist.models import (
                BlacklistedToken,
                OutstandingToken,
            )

            for token in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            pass

        user.is_active = False
        user.email = f"deleted_{uid}@invalid.local"
        user.username = f"deleted_{uid}"
        user.first_name = ""
        user.last_name = ""
        user.bio = ""
        user.city = ""
        user.flair = ""
        user.totp_enabled = False
        user.totp_secret = ""
        user.set_unusable_password()
        if user.avatar:
            user.avatar.delete(save=False)
            user.avatar = None
        user.save()

        Friendship.objects.filter(Q(from_user=user) | Q(to_user=user)).delete()
        UserFollow.objects.filter(follower=user).delete()
        UserFollow.objects.filter(following=user).delete()

        return Response({"ok": True, "closed": True}, status=status.HTTP_200_OK)
