"""Studies partagées — équivalent Lichess Studies v1."""

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SharedStudy, StudyChapter, StudyCollaborator
from .study_pgn_io import export_study_pgn, import_study_pgn

User = get_user_model()

_VALID_VISIBILITY = {c.value for c in SharedStudy.Visibility}


def _normalize_visibility(value, default=SharedStudy.Visibility.PRIVATE):
    if value is None or value == "":
        return default
    if value not in _VALID_VISIBILITY:
        return None
    return value


def _can_view(study: SharedStudy, user) -> bool:
    if study.visibility == SharedStudy.Visibility.PUBLIC:
        return True
    if not user or not user.is_authenticated:
        return False
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
        data["collaborators"] = [
            {
                "username": c.user.username,
                "role": c.role,
            }
            for c in study.collaborators.select_related("user").all()
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
        visibility = _normalize_visibility(
            request.data.get("visibility"), SharedStudy.Visibility.PRIVATE
        )
        if visibility is None:
            return Response({"error": "visibility invalide"}, status=400)
        study = SharedStudy.objects.create(
            owner=request.user,
            title=title,
            description=(request.data.get("description") or "")[:5000],
            visibility=visibility,
        )
        StudyChapter.objects.create(study=study, title="Chapitre 1", order=0)
        return Response(_serialize_study(study, detailed=True), status=status.HTTP_201_CREATED)


class SharedStudyDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, study_id):
        try:
            study = SharedStudy.objects.prefetch_related("chapters", "collaborators__user").get(
                pk=study_id
            )
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
        if "title" in request.data:
            study.title = str(request.data["title"] or "")[:200]
        if "description" in request.data:
            study.description = str(request.data["description"] or "")[:5000]
        if "visibility" in request.data:
            visibility = _normalize_visibility(request.data["visibility"], study.visibility)
            if visibility is None:
                return Response({"error": "visibility invalide"}, status=400)
            study.visibility = visibility
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
            initial_fen=request.data.get("initial_fen")
            or StudyChapter._meta.get_field("initial_fen").default,
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

    def delete(self, request, study_id, chapter_id):
        try:
            study = SharedStudy.objects.get(pk=study_id)
            ch = StudyChapter.objects.get(pk=chapter_id, study=study)
        except (SharedStudy.DoesNotExist, StudyChapter.DoesNotExist):
            return Response({"error": "Not found"}, status=404)
        if not _can_edit(study, request.user):
            return Response({"error": "Forbidden"}, status=403)
        if study.chapters.count() <= 1:
            return Response({"error": "Au moins un chapitre requis"}, status=400)
        ch.delete()
        study.save(update_fields=["updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudyCollaboratorView(APIView):
    """Invite / retire collaborateurs (owner uniquement)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, study_id):
        try:
            study = SharedStudy.objects.get(pk=study_id)
        except SharedStudy.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if study.owner_id != request.user.id:
            return Response({"error": "Forbidden"}, status=403)
        username = (request.data.get("username") or "").strip()
        role = request.data.get("role") or StudyCollaborator.Role.VIEWER
        if role not in {c.value for c in StudyCollaborator.Role}:
            return Response({"error": "role invalide"}, status=400)
        try:
            user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        if user.id == study.owner_id:
            return Response({"error": "Le propriétaire est déjà membre"}, status=400)
        collab, _ = StudyCollaborator.objects.update_or_create(
            study=study, user=user, defaults={"role": role}
        )
        return Response(
            {"username": user.username, "role": collab.role},
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, study_id):
        try:
            study = SharedStudy.objects.get(pk=study_id)
        except SharedStudy.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if study.owner_id != request.user.id:
            return Response({"error": "Forbidden"}, status=403)
        username = (
            request.data.get("username") or request.query_params.get("username") or ""
        ).strip()
        if not username:
            return Response({"error": "username requis"}, status=400)
        deleted, _ = StudyCollaborator.objects.filter(
            study=study, user__username__iexact=username
        ).delete()
        if not deleted:
            return Response({"error": "Collaborateur introuvable"}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)


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
                initial_fen=ch_data["initial_fen"]
                or StudyChapter._meta.get_field("initial_fen").default,
            )
            created.append(ch.id)
        study.save(update_fields=["updated_at"])
        return Response(
            {"imported": len(created), "chapter_ids": created},
            status=status.HTTP_201_CREATED,
        )
