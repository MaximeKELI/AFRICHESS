"""Tests approfondis Section 5 — Studies / Learning."""

import chess
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.learning.level3_views import _uci_from_pgn
from apps.learning.models import (
    ClassroomSession,
    Course,
    LineReview,
    Quiz,
    SharedStudy,
    StudyChapter,
    StudyCollaborator,
    StudyLine,
    UserProgress,
)
from apps.learning.study_review import get_due_lines

User = get_user_model()


class StudyReviewPartialMoveTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="srs_u", password="x")
        self.line = StudyLine.objects.create(
            user=self.user,
            name="Italian",
            moves_uci=["e2e4", "e7e5", "g1f3"],
        )
        LineReview.objects.create(
            user=self.user, line=self.line, next_review=timezone.now()
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_prefix_does_not_schedule(self):
        before = LineReview.objects.get(user=self.user, line=self.line).next_review
        r = self.client.post(
            f"/api/learning/study/{self.line.id}/review/",
            {"moves": ["e2e4"]},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["correct"])
        self.assertFalse(r.data["completed"])
        self.assertFalse(r.data["scheduled"])
        after = LineReview.objects.get(user=self.user, line=self.line).next_review
        self.assertEqual(before, after)
        self.assertEqual(len(get_due_lines(self.user)), 1)

    def test_wrong_move_schedules(self):
        r = self.client.post(
            f"/api/learning/study/{self.line.id}/review/",
            {"moves": ["d2d4"]},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.data["correct"])
        self.assertTrue(r.data["scheduled"])
        review = LineReview.objects.get(user=self.user, line=self.line)
        self.assertGreater(review.next_review, timezone.now())
        self.assertEqual(len(get_due_lines(self.user)), 0)

    def test_full_line_schedules_success(self):
        r = self.client.post(
            f"/api/learning/study/{self.line.id}/review/",
            {"moves": ["e2e4", "e7e5", "g1f3"]},
            format="json",
        )
        self.assertTrue(r.data["completed"])
        self.assertTrue(r.data["scheduled"])
        review = LineReview.objects.get(user=self.user, line=self.line)
        self.assertEqual(review.repetitions, 1)


class QuizProgressTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="quiz_u", password="x")
        self.course = Course.objects.create(
            title="C1", slug="c1-quiz", is_published=True
        )
        from apps.learning.models import Lesson

        Lesson.objects.create(course=self.course, title="L1", order=1, content="x")
        Lesson.objects.create(course=self.course, title="L2", order=2, content="x")
        self.quiz = Quiz.objects.create(
            course=self.course,
            title="Q1",
            passing_score=50,
            questions=[{"correct_index": 0, "choices": ["a", "b"]}],
            xp_reward=10,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_quiz_pass_does_not_force_100(self):
        r = self.client.post(
            f"/api/learning/quizzes/{self.quiz.pk}/submit/",
            {"answers": [0]},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["passed"])
        prog = UserProgress.objects.get(user=self.user, course=self.course)
        self.assertTrue(prog.quiz_passed)
        self.assertEqual(prog.progress_percent, 0)


class UciFromPgnFenTests(TestCase):
    def test_respects_fen_header(self):
        # Position after 1.e4 — next move e7e5
        fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
        pgn = f'[FEN "{fen}"]\n[SetUp "1"]\n\n1... e5 *'
        moves = _uci_from_pgn(pgn)
        self.assertEqual(moves, ["e7e5"])


class ClassroomFenAndPrivacyTests(TestCase):
    def setUp(self):
        self.host = User.objects.create_user(username="cls_h", password="x")
        self.other = User.objects.create_user(username="cls_o", password="x")
        self.room = ClassroomSession.objects.create(
            host=self.host, code="ABC123", title="Test"
        )
        self.client = APIClient()

    def test_invalid_fen_rejected(self):
        self.client.force_authenticate(self.host)
        r = self.client.patch(
            "/api/learning/classroom/ABC123/",
            {"fen": "not-a-fen"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)

    def test_valid_fen_accepted(self):
        self.client.force_authenticate(self.host)
        fen = chess.STARTING_FEN
        r = self.client.patch(
            "/api/learning/classroom/ABC123/",
            {"fen": fen},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.room.refresh_from_db()
        self.assertEqual(self.room.current_fen, fen)

    def test_list_only_own_rooms(self):
        ClassroomSession.objects.create(host=self.other, code="XYZ999")
        self.client.force_authenticate(self.host)
        r = self.client.get("/api/learning/classroom/")
        codes = [row["code"] for row in r.data]
        self.assertIn("ABC123", codes)
        self.assertNotIn("XYZ999", codes)


class SharedStudyAclTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="st_own", password="x")
        self.editor = User.objects.create_user(username="st_ed", password="x")
        self.stranger = User.objects.create_user(username="st_str", password="x")
        self.study = SharedStudy.objects.create(
            owner=self.owner,
            title="Private Study",
            visibility=SharedStudy.Visibility.PRIVATE,
        )
        StudyChapter.objects.create(study=self.study, title="Ch1", order=0)
        self.client = APIClient()

    def test_private_forbidden_for_stranger(self):
        self.client.force_authenticate(self.stranger)
        r = self.client.get(f"/api/learning/studies/{self.study.id}/")
        self.assertEqual(r.status_code, 403)

    def test_invalid_visibility_rejected(self):
        self.client.force_authenticate(self.owner)
        r = self.client.post(
            "/api/learning/studies/",
            {"title": "X", "visibility": "everyone"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)

    def test_collaborator_editor_can_edit(self):
        StudyCollaborator.objects.create(
            study=self.study,
            user=self.editor,
            role=StudyCollaborator.Role.EDITOR,
        )
        self.client.force_authenticate(self.editor)
        r = self.client.patch(
            f"/api/learning/studies/{self.study.id}/",
            {"title": "Edited"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.study.refresh_from_db()
        self.assertEqual(self.study.title, "Edited")

    def test_add_and_remove_collaborator(self):
        self.client.force_authenticate(self.owner)
        add = self.client.post(
            f"/api/learning/studies/{self.study.id}/collaborators/",
            {"username": "st_ed", "role": "viewer"},
            format="json",
        )
        self.assertEqual(add.status_code, 201)
        self.assertTrue(
            StudyCollaborator.objects.filter(study=self.study, user=self.editor).exists()
        )
        rem = self.client.delete(
            f"/api/learning/studies/{self.study.id}/collaborators/?username=st_ed"
        )
        self.assertEqual(rem.status_code, 204)

    def test_chapter_delete_keeps_one(self):
        ch2 = StudyChapter.objects.create(study=self.study, title="Ch2", order=1)
        self.client.force_authenticate(self.owner)
        ok = self.client.delete(
            f"/api/learning/studies/{self.study.id}/chapters/{ch2.id}/"
        )
        self.assertEqual(ok.status_code, 204)
        only = self.study.chapters.first()
        bad = self.client.delete(
            f"/api/learning/studies/{self.study.id}/chapters/{only.id}/"
        )
        self.assertEqual(bad.status_code, 400)
