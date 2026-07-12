"""API Practice — catalogue Lichess + progression."""

from __future__ import annotations

from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PracticeChapter, PracticeProgress, PracticeSection, PracticeStudy


class PracticeStructureView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        completed_ids: set[int] = set()
        if request.user.is_authenticated:
            completed_ids = set(
                PracticeProgress.objects.filter(user=request.user).values_list(
                    "chapter_id", flat=True
                )
            )

        sections = []
        for sec in PracticeSection.objects.prefetch_related("studies__chapters").all():
            studies = []
            for st in sec.studies.all():
                chapter_ids = [c.id for c in st.chapters.all()]
                done = sum(1 for cid in chapter_ids if cid in completed_ids)
                studies.append(
                    {
                        "id": st.id,
                        "slug": st.slug,
                        "lichess_id": st.lichess_id,
                        "title": st.title,
                        "description": st.description,
                        "chapter_count": len(chapter_ids),
                        "completed_count": done,
                    }
                )
            sections.append(
                {
                    "slug": sec.slug,
                    "name": sec.name,
                    "studies": studies,
                }
            )
        return Response({"sections": sections, "source": "lichess"})


class PracticeStudyDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            study = PracticeStudy.objects.select_related("section").prefetch_related(
                "chapters"
            ).get(slug=slug)
        except PracticeStudy.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)

        completed_ids: set[int] = set()
        if request.user.is_authenticated:
            completed_ids = set(
                PracticeProgress.objects.filter(
                    user=request.user, chapter__study=study
                ).values_list("chapter_id", flat=True)
            )

        chapters = [
            {
                "id": c.id,
                "title": c.title,
                "order": c.order,
                "goal": c.goal,
                "goal_moves": c.goal_moves,
                "completed": c.id in completed_ids,
            }
            for c in study.chapters.all()
        ]
        return Response(
            {
                "id": study.id,
                "slug": study.slug,
                "title": study.title,
                "description": study.description,
                "section": {"slug": study.section.slug, "name": study.section.name},
                "chapters": chapters,
            }
        )


class PracticeChapterDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, chapter_id):
        try:
            ch = PracticeChapter.objects.select_related("study").get(pk=chapter_id)
        except PracticeChapter.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)
        return Response(
            {
                "id": ch.id,
                "title": ch.title,
                "fen": ch.fen,
                "pgn": ch.pgn,
                "solution_uci": ch.solution_uci,
                "goal": ch.goal,
                "goal_moves": ch.goal_moves,
                "study": {"slug": ch.study.slug, "title": ch.study.title},
            }
        )


class PracticeChapterCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chapter_id):
        try:
            ch = PracticeChapter.objects.get(pk=chapter_id)
        except PracticeChapter.DoesNotExist:
            return Response({"error": "Introuvable"}, status=404)
        nb = int(request.data.get("nb_moves") or 0)
        prog, created = PracticeProgress.objects.update_or_create(
            user=request.user,
            chapter=ch,
            defaults={"nb_moves": nb, "completed_at": timezone.now()},
        )
        return Response(
            {
                "ok": True,
                "created": created,
                "chapter_id": ch.id,
                "nb_moves": prog.nb_moves,
            }
        )
