"""Studies partagées — équivalent Lichess Studies v1."""

from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SharedStudy, StudyChapter, StudyCollaborator
from .study_pgn_io import export_study_pgn, import_study_pgn


def _can_view(study: SharedStudy, user) -> bool:
    if study.visibility == SharedStudy.Visibility.PUBLIC:
        return True
    if not user or not user.is_authenticated:
        return study.visibility == SharedStudy.Visibility.PUBLIC
    if study.owner_id == user.id:
        return True
    if study.visibility == SharedStudy.Visibility.UNLISTED:
        return True
    return StudyCollaborator.objects.filter(study=study, user=user).exists()


def _can_edit(study: SharedStudy, user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if study.owner_id == user.id:
        return True
    return StudyCollaborator.objects.filter(
        study=study, user=user, role=StudyCollaborator.Role.EDITOR
    ).exists()


def _serialize_study(study: SharedStudy, detailed: bool = False) -> dict:
    data = {
        "id": study.id,
        "title": study.title,
        "description": study.description,
        "visibility": study.visibility,
        "owner": study.owner.username,
        "owner_id": study.owner_id,
        "updated_at": study.updated_at.isoformat(),
        "chapter_count": study.chapters.count(),
    }
    if detailed:
        data["chapters"] = [
            {
                "id": ch.id,
                "title": ch.title,
                "order": ch.order,
                "pgn": ch.pgn,
                "initial_fen": ch.initial_fen,
            }
            for ch in study.chapters.all()
        ]
    return data


class SharedStudyListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = SharedStudy.objects.filter(visibility=SharedStudy.Visibility.PUBLIC)
        if request.user.is_authenticated:
            qs = SharedStudy.objects.filter(
                Q(visibility=SharedStudy.Visibility.PUBLIC)
                | Q(owner=request.user)
                | Q(collaborators__user=request.user)
            ).distinct()
        return Response([_serialize_study(s) for s in qs[:100]])

    def post(self, request):
        title = (request.data.get("title") or "Nouvelle étude")[:200]
        study = SharedStudy.objects.create(
            owner=request.user,
            title=title,
            description=(request.data.get("description") or "")[:5000],
            visibility=request.data.get("visibility") or SharedStudy.Visibility.PRIVATE,
        )
        StudyChapter.objects.create(study=study, title="Chapitre 1", order=0)
        return Response(_serialize_study(study, detailed=True), status=status.HTTP_201_CREATED)


class SharedStudyDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, study_id):
        try:
            study = SharedStudy.objects.prefetch_related("chapters").get(pk=study_id)
        except SharedStudy.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not _can_view(study, request.user):
            return Response({"error": "Forbidden"}, status=403)
        return Response(_serialize_study(study, detailed=True))

    def patch(self, request, study_id):
        try:
            study = SharedStudy.objects.get(pk=study_id)
        except SharedStudy.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not _can_edit(study, request.user):
            return Response({"error": "Forbidden"}, status=403)
        for field in ("title", "description", "visibility"):
            if field in request.data:
                setattr(study, field, request.data[field])
        study.save()
        return Response(_serialize_study(study, detailed=True))

    def delete(self, request, study_id):
        try:
            study = SharedStudy.objects.get(pk=study_id)
        except SharedStudy.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if study.owner_id != request.user.id:
            return Response({"error": "Forbidden"}, status=403)
        study.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudyChapterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, study_id):
        try:
            study = SharedStudy.objects.get(pk=study_id)
        except SharedStudy.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not _can_edit(study, request.user):
            return Response({"error": "Forbidden"}, status=403)
        order = study.chapters.count()
        ch = StudyChapter.objects.create(
            study=study,
            title=(request.data.get("title") or f"Chapitre {order + 1}")[:200],
            order=order,
            pgn=request.data.get("pgn") or "",
            initial_fen=request.data.get("initial_fen") or StudyChapter._meta.get_field("initial_fen").default,
        )
        study.save(update_fields=["updated_at"])
        return Response(
            {"id": ch.id, "title": ch.title, "order": ch.order, "pgn": ch.pgn},
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, study_id, chapter_id):
        try:
            study = SharedStudy.objects.get(pk=study_id)
            ch = StudyChapter.objects.get(pk=chapter_id, study=study)
        except (SharedStudy.DoesNotExist, StudyChapter.DoesNotExist):
            return Response({"error": "Not found"}, status=404)
        if not _can_edit(study, request.user):
            return Response({"error": "Forbidden"}, status=403)
        for field in ("title", "pgn", "initial_fen", "order"):
            if field in request.data:
                setattr(ch, field, request.data[field])
        ch.save()
        study.save(update_fields=["updated_at"])
        return Response({"id": ch.id, "title": ch.title, "pgn": ch.pgn})


class StudyExportView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, study_id):
        try:
            study = SharedStudy.objects.prefetch_related("chapters").get(pk=study_id)
        except SharedStudy.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not _can_view(study, request.user):
            return Response({"error": "Forbidden"}, status=403)
        chapters = study.chapters.order_by("order")
        pgn = export_study_pgn(study, chapters)
        return Response({"pgn": pgn, "format": "lichess_multi_pgn"})


class StudyImportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, study_id):
        try:
            study = SharedStudy.objects.get(pk=study_id)
        except SharedStudy.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not _can_edit(study, request.user):
            return Response({"error": "Forbidden"}, status=403)
        pgn = request.data.get("pgn") or ""
        replace = bool(request.data.get("replace"))
        chapters_data = import_study_pgn(pgn)
        if not chapters_data:
            return Response({"error": "PGN vide ou invalide"}, status=400)
        if replace:
            study.chapters.all().delete()
        base_order = 0 if replace else study.chapters.count()
        created = []
        for i, ch_data in enumerate(chapters_data):
            ch = StudyChapter.objects.create(
                study=study,
                title=ch_data["title"],
                order=base_order + i,
                pgn=ch_data["pgn"],
                initial_fen=ch_data["initial_fen"] or StudyChapter._meta.get_field("initial_fen").default,
            )
            created.append(ch.id)
        study.save(update_fields=["updated_at"])
        return Response(
            {"imported": len(created), "chapter_ids": created},
            status=status.HTTP_201_CREATED,
        )
