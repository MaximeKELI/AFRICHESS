from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.learning.models import Course

User = get_user_model()


class LearningApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="learn1", password="x")
        self.client = APIClient()
        Course.objects.create(
            slug="test-course",
            title="Test",
            description="Desc",
            level="beginner",
            is_published=True,
            order=1,
        )

    def test_course_list_public(self):
        res = self.client.get("/api/learning/courses/")
        self.assertEqual(res.status_code, 200)
        slugs = [c["slug"] for c in res.data.get("results", res.data)]
        self.assertIn("test-course", slugs)

    def test_dashboard_requires_auth(self):
        res = self.client.get("/api/learning/dashboard/")
        self.assertEqual(res.status_code, 401)
        self.client.force_authenticate(self.user)
        res2 = self.client.get("/api/learning/dashboard/")
        self.assertEqual(res2.status_code, 200)
        self.assertIn("profile", res2.data)
        self.assertIn("coach_tips", res2.data)
