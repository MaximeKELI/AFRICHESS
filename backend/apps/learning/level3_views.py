"""Vues niveau 3 — répertoires, étude, vidéos, classroom, insights."""

from __future__ import annotations

import secrets
import string

import chess
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.stats_service import build_user_stats_payload

from .coach import generate_coach_payload, generate_coach_tips
from .models import (
    ClassroomSession,
    LineReview,
    OpeningRepertoire,
    RepertoireLine,
    StudyLine,
    Video,
)
from .study_review import get_due_lines, schedule_review


class InsightsView(APIView):
    """Hub Insights — stats + coach + thèmes faibles."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        stats = build_user_stats_payload(user)
        coach = generate_coach_payload(user)
        return Response({
            "stats": stats,
            "coach_tips": coach["tips"],
            "training_plan": coach["training_plan"],
        })


class VideoListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .premium_access import can_access_premium_video, user_has_learning_premium

        qs = Video.objects.all()
        cat = request.query_params.get("category")
        if cat:
            qs = qs.filter(category=cat)
        lang = (request.query_params.get("lang") or "fr")[:2]
        premium = user_has_learning_premium(request.user)
        data = []
        for v in qs[:50]:
            locked = v.is_premium and not can_access_premium_video(request.user, v)
            data.append(
                {
                    "id": v.id,
                    "title": v.title_en if lang == "en" and v.title_en else v.title,
                    "url": "" if locked else v.url,
                    "description": v.description if not locked else "",
                    "category": v.category,
                    "is_premium": v.is_premium,
                    "locked": locked,
                }
            )
        return Response(data)


class RepertoireListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        reps = OpeningRepertoire.objects.filter(user=request.user).prefetch_related("lines")
        return Response([
            {
                "id": r.id,
                "name": r.name,
                "color": r.color,
                "lines": [
                    {"id": ln.id, "name": ln.name, "moves_san": ln.moves_san, "order": ln.order}
                    for ln in r.lines.all()
                ],
            }
            for r in reps
        ])

    def post(self, request):
        name = (request.data.get("name") or "Mon répertoire")[:120]
        color = request.data.get("color", "white")
        if color not in ("white", "black"):
            color = "white"
        rep = OpeningRepertoire.objects.create(user=request.user, name=name, color=color)
        return Response({"id": rep.id, "name": rep.name, "color": rep.color}, status=201)


class RepertoireLineView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, rep_id):
        try:
            rep = OpeningRepertoire.objects.get(pk=rep_id, user=request.user)
        except OpeningRepertoire.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)
        name = (request.data.get("name") or "Ligne")[:120]
        moves = request.data.get("moves_san") or request.data.get("moves") or []
        if not isinstance(moves, list):
            return Response({"error": "moves_san requis (liste)"}, status=400)
        order = rep.lines.count()
        line = RepertoireLine.objects.create(
            repertoire=rep, name=name, moves_san=moves, order=order
        )
        return Response({"id": line.id, "name": line.name, "moves_san": line.moves_san}, status=201)

    def delete(self, request, rep_id, line_id):
        deleted, _ = RepertoireLine.objects.filter(
            pk=line_id, repertoire_id=rep_id, repertoire__user=request.user
        ).delete()
        if not deleted:
            return Response({"error": "Introuvable"}, status=404)
        return Response(status=204)


class StudyLineListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        lines = StudyLine.objects.filter(user=request.user)
        due = {ln.id for ln in get_due_lines(request.user, 20)}
        return Response([
            {
                "id": ln.id,
                "name": ln.name,
                "color": ln.color,
                "move_count": len(ln.moves_uci),
                "due": ln.id in due,
            }
            for ln in lines
        ])

    def post(self, request):
        name = (request.data.get("name") or "Ma ligne")[:120]
        color = request.data.get("color", "white")
        moves = request.data.get("moves_uci") or []
        if not moves:
            pgn = request.data.get("pgn", "")
            if pgn:
                moves = _uci_from_pgn(pgn)
        if not moves:
            return Response({"error": "moves_uci ou pgn requis"}, status=400)
        line = StudyLine.objects.create(
            user=request.user, name=name, color=color, moves_uci=moves
        )
        LineReview.objects.create(
            user=request.user, line=line, next_review=timezone.now()
        )
        return Response({"id": line.id, "name": line.name}, status=201)


class StudyReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        due = get_due_lines(request.user, 5)
        if not due:
            return Response({"due": None})
        ln = due[0]
        return Response({
            "line_id": ln.id,
            "name": ln.name,
            "color": ln.color,
            "moves_uci": ln.moves_uci,
        })

    def post(self, request, line_id):
        try:
            line = StudyLine.objects.get(pk=line_id, user=request.user)
        except StudyLine.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)
        played = request.data.get("moves") or request.data.get("moves_uci") or []
        expected = line.moves_uci[: len(played)]
        correct = played == expected
        quality = 5 if correct and len(played) >= len(line.moves_uci) else (3 if correct else 1)
        review = schedule_review(request.user, line, quality)
        return Response({
            "correct": correct,
            "next_review": review.next_review.isoformat(),
            "completed": correct and len(played) >= len(line.moves_uci),
        })


class ClassroomListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        code = request.query_params.get("code")
        if code:
            try:
                room = ClassroomSession.objects.get(code=code.upper(), is_active=True)
            except ClassroomSession.DoesNotExist:
                return Response({"error": "Salle introuvable"}, status=404)
            return Response(_classroom_payload(room))
        rooms = ClassroomSession.objects.filter(is_active=True).select_related("host")[:20]
        return Response([
            {
                "code": r.code,
                "title": r.title or f"Cours de {r.host.display_name or r.host.username}",
                "host": r.host.username,
            }
            for r in rooms
        ])

    def post(self, request):
        code = _random_code()
        while ClassroomSession.objects.filter(code=code).exists():
            code = _random_code()
        title = (request.data.get("title") or "")[:120]
        room = ClassroomSession.objects.create(host=request.user, code=code, title=title)
        return Response(_classroom_payload(room), status=201)


class ClassroomDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, code):
        try:
            room = ClassroomSession.objects.get(code=code.upper())
        except ClassroomSession.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)
        if room.host_id != request.user.id:
            return Response({"error": "Réservé à l'hôte"}, status=403)
        fen = request.data.get("fen")
        if fen:
            room.current_fen = fen[:100]
        if "is_active" in request.data:
            room.is_active = bool(request.data["is_active"])
        room.save()
        return Response(_classroom_payload(room))


def _random_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(6))


def _classroom_payload(room: ClassroomSession) -> dict:
    fen = room.current_fen
    if fen == "startpos":
        fen = chess.STARTING_FEN
    return {
        "code": room.code,
        "title": room.title,
        "host": room.host.username,
        "current_fen": fen,
        "is_active": room.is_active,
    }


def _uci_from_pgn(pgn: str) -> list[str]:
    import io

    game = chess.pgn.read_game(io.StringIO(pgn))
    if not game:
        return []
    board = chess.Board()
    moves = []
    node = game
    while node.variations:
        node = node.variation(0)
        if node.move:
            board.push(node.move)
            moves.append(node.move.uci())
    return moves
