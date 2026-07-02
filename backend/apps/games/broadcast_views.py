"""Broadcast relay multi-board — lecture seule."""

from django.db.models import Max, Q
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Broadcast, BroadcastBoard, Game
from apps.games.serializers import GameSerializer
from apps.tournaments.models import Tournament


def _serialize_broadcast(b: Broadcast, *, detailed: bool = False) -> dict:
    boards = b.boards.select_related(
        "game__white_player", "game__black_player"
    ).order_by("board_number")
    data = {
        "slug": b.slug,
        "title": b.title,
        "description": b.description,
        "status": b.status,
        "is_public": b.is_public,
        "tournament_slug": b.tournament.slug if b.tournament_id else None,
        "board_count": boards.count(),
        "synced_at": b.synced_at.isoformat() if b.synced_at else None,
        "created_at": b.created_at.isoformat(),
    }
    if detailed:
        data["boards"] = [
            {
                "board_number": bb.board_number,
                "label": bb.label,
                "game": GameSerializer(bb.game).data,
            }
            for bb in boards
        ]
    return data


def _unique_slug(base: str) -> str:
    slug = slugify(base)[:100] or "broadcast"
    candidate = slug
    n = 2
    while Broadcast.objects.filter(slug=candidate).exists():
        candidate = f"{slug}-{n}"
        n += 1
    return candidate


class BroadcastListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        if request.user.is_authenticated:
            qs = Broadcast.objects.filter(
                Q(is_public=True) | Q(created_by=request.user)
            ).distinct()
        else:
            qs = Broadcast.objects.filter(is_public=True)
        qs = qs.select_related("tournament").order_by("-created_at")[:50]
        return Response([_serialize_broadcast(b) for b in qs])

    def post(self, request):
        title = (request.data.get("title") or "Broadcast")[:200]
        slug = _unique_slug(request.data.get("slug") or title)
        tournament = None
        t_slug = request.data.get("tournament_slug")
        if t_slug:
            tournament = Tournament.objects.filter(slug=t_slug).first()
        b = Broadcast.objects.create(
            slug=slug,
            title=title,
            description=(request.data.get("description") or "")[:5000],
            is_public=request.data.get("is_public", True),
            tournament=tournament,
            created_by=request.user,
        )
        return Response(_serialize_broadcast(b), status=status.HTTP_201_CREATED)


class BroadcastDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            b = Broadcast.objects.select_related("tournament").get(slug=slug)
        except Broadcast.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not b.is_public and (
            not request.user.is_authenticated or b.created_by_id != request.user.id
        ):
            return Response({"error": "Forbidden"}, status=403)
        return Response(_serialize_broadcast(b, detailed=True))


class BroadcastSyncView(APIView):
    """Synchronise les échiquiers depuis le tournoi lié ou une liste de game_ids."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        try:
            b = Broadcast.objects.get(slug=slug)
        except Broadcast.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if b.created_by_id != request.user.id and not request.user.is_staff:
            return Response({"error": "Forbidden"}, status=403)

        game_ids = request.data.get("game_ids") or []
        games = []
        if game_ids:
            games = list(
                Game.objects.filter(id__in=game_ids).select_related(
                    "white_player", "black_player"
                )
            )
        elif b.tournament_id:
            games = list(
                Game.objects.filter(
                    tournament=b.tournament,
                    status__in=[Game.Status.ACTIVE, Game.Status.COMPLETED],
                )
                .select_related("white_player", "black_player")
                .order_by("-created_at")[:64]
            )

        max_no = (
            b.boards.aggregate(m=Max("board_number")).get("m") or 0
        )
        added = 0
        for game in games:
            if b.boards.filter(game=game).exists():
                continue
            max_no += 1
            w = game.white_player.username if game.white_player_id else "?"
            bl = game.black_player.username if game.black_player_id else "?"
            BroadcastBoard.objects.create(
                broadcast=b,
                game=game,
                board_number=max_no,
                label=f"{w} vs {bl}",
            )
            added += 1

        b.synced_at = timezone.now()
        b.save(update_fields=["synced_at"])
        return Response(
            {"added": added, "broadcast": _serialize_broadcast(b, detailed=True)}
        )
