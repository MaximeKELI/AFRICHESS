"""Tests Practice API + parse PGN + seed minimal."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.learning.models import PracticeChapter, PracticeSection, PracticeStudy
from apps.learning.practice_import import parse_practice_pgn
from apps.learning.practice_catalog import PRACTICE_CATALOG

User = get_user_model()

SAMPLE_PGN = """
[Event "Queen mate"]
[Site "https://lichess.org/study/demo"]
[FEN "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1"]
[SetUp "1"]
[PracticeGoal "mate"]

1. Qf8#

[Event "Second"]
[FEN "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1"]
[SetUp "1"]

1. Re8#
"""


class PracticeParseTests(TestCase):
    def test_parse_practice_pgn_chapters(self):
        chapters = parse_practice_pgn(SAMPLE_PGN)
        self.assertGreaterEqual(len(chapters), 2)
        self.assertEqual(chapters[0]["title"], "Queen mate")
        self.assertTrue(chapters[0]["fen"].startswith("7k/5Q2"))
        self.assertTrue(len(chapters[0]["solution_uci"]) >= 1)

    def test_catalog_has_all_sections(self):
        slugs = {s["slug"] for s in PRACTICE_CATALOG}
        self.assertIn("checkmates", slugs)
        self.assertIn("fundamental-tactics", slugs)
        self.assertIn("advanced-tactics", slugs)
        studies = sum(len(s["studies"]) for s in PRACTICE_CATALOG)
        self.assertGreaterEqual(studies, 30)


class PracticeApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="prac_u", password="x")
        sec = PracticeSection.objects.create(slug="checkmates", name="Checkmates", order=0)
        study = PracticeStudy.objects.create(
            section=sec,
            slug="piece-checkmates-i",
            lichess_id="demo0001",
            title="Piece Checkmates I",
            order=0,
        )
        self.chapter = PracticeChapter.objects.create(
            study=study,
            title="Queen mate",
            order=0,
            fen="7k/5Q2/6K1/8/8/8/8/8 w - - 0 1",
            solution_uci=["f7f8"],
            goal=PracticeChapter.Goal.MATE,
        )

    def test_structure_public(self):
        res = self.client.get("/api/learning/practice/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["sections"]), 1)
        self.assertEqual(res.data["sections"][0]["studies"][0]["chapter_count"], 1)

    def test_study_detail(self):
        res = self.client.get("/api/learning/practice/studies/piece-checkmates-i/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["chapters"]), 1)

    def test_chapter_detail(self):
        res = self.client.get(f"/api/learning/practice/chapters/{self.chapter.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["solution_uci"], ["f7f8"])

    def test_complete_requires_auth(self):
        res = self.client.post(
            f"/api/learning/practice/chapters/{self.chapter.id}/complete/",
            {"nb_moves": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 401)

    def test_complete_chapter(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(
            f"/api/learning/practice/chapters/{self.chapter.id}/complete/",
            {"nb_moves": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["ok"])
        # progress reflected
        res2 = self.client.get("/api/learning/practice/studies/piece-checkmates-i/")
        self.assertTrue(res2.data["chapters"][0]["completed"])
