"""Tests API niveau 3 — insights, vidéos, répertoires, étude, classroom."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.learning.models import StudyLine, Video

User = get_user_model()


class LearningLevel3ApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="l3_u", password="x")
        self.client = APIClient()
        Video.objects.create(title="Intro", url="https://youtube.com/watch?v=abc", category="basics")

    def test_insights_requires_auth(self):
        res = self.client.get("/api/learning/insights/")
        self.assertEqual(res.status_code, 401)

    def test_insights_authenticated(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/learning/insights/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("coach_tips", res.data)
        self.assertIn("training_plan", res.data)

    def test_videos_list_public(self):
        res = self.client.get("/api/learning/videos/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(len(res.data) >= 1)

    def test_repertoire_crud(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(
            "/api/learning/repertoires/",
            {"name": "White e4", "color": "white"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        rep_id = res.data["id"]
        res2 = self.client.post(
            f"/api/learning/repertoires/{rep_id}/lines/",
            {"name": "Italian", "moves_san": ["e4", "e5", "Nf3"]},
            format="json",
        )
        self.assertEqual(res2.status_code, 201)

    def test_study_review_empty(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/learning/study/review/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["due"])

    def test_study_line_creates_review(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(
            "/api/learning/study/",
            {"name": "Line1", "moves_uci": ["e2e4", "e7e5"]},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        review = self.client.get("/api/learning/study/review/")
        self.assertEqual(review.status_code, 200)

    def test_classroom_create(self):
        self.client.force_authenticate(self.user)
        res = self.client.post("/api/learning/classroom/", {"title": "Cours test"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("code", res.data)
