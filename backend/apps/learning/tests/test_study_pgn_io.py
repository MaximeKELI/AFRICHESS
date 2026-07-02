"""Tests import/export Studies PGN."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.learning.models import SharedStudy, StudyChapter
from apps.learning.study_pgn_io import export_study_pgn, import_study_pgn

User = get_user_model()

SAMPLE_PGN = """[Event "Opening trap"]
[Site "AFRICHESS Study 1"]
[ChapterOrder "0"]
[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"]
[SetUp "1"]

1. e4 e5 2. Nf3

[Event "Endgame"]
[ChapterOrder "1"]

1. d4 d5 2. c4
"""


class StudyPgnIoTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="study_io", password="x")
        self.study = SharedStudy.objects.create(
            owner=self.user,
            title="Test Study",
            visibility=SharedStudy.Visibility.PUBLIC,
        )
        StudyChapter.objects.create(
            study=self.study, title="Ch1", order=0, pgn="1. e4 e5"
        )

    def test_import_multi_chapter(self):
        chapters = import_study_pgn(SAMPLE_PGN)
        self.assertEqual(len(chapters), 2)
        self.assertEqual(chapters[0]["title"], "Opening trap")
        self.assertIn("e4", chapters[0]["pgn"])

    def test_export_roundtrip(self):
        exported = export_study_pgn(self.study, self.study.chapters.all())
        imported = import_study_pgn(exported)
        self.assertGreaterEqual(len(imported), 1)
        self.assertEqual(imported[0]["title"], "Ch1")

    def test_import_api(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            f"/api/learning/studies/{self.study.id}/import/",
            {"pgn": SAMPLE_PGN, "replace": True},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.study.chapters.count(), 2)

    def test_export_api(self):
        res = self.client.get(f"/api/learning/studies/{self.study.id}/export/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("pgn", res.data)
