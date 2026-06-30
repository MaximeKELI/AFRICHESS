"""Tests gating premium learning."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.learning.models import Course, Lesson, Video
from apps.learning.premium_access import FREE_LESSONS_PER_COURSE, can_access_lesson
from apps.users.models import User as UserModel

User = get_user_model()


class LearningPremiumAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.free_user = User.objects.create_user(username="learn_free", password="x")
        self.premium_user = User.objects.create_user(username="learn_gold", password="x")
        self.premium_user.subscription_tier = UserModel.SubscriptionTier.GOLD
        self.premium_user.save()
        self.course = Course.objects.create(title="Tactics", slug="tactics-gate", is_published=True)
        self.lesson_free = Lesson.objects.create(
            course=self.course, title="L1", content="intro", order=1
        )
        self.lesson_premium = Lesson.objects.create(
            course=self.course, title="L3", content="advanced", order=3
        )
        self.video_free = Video.objects.create(title="Free vid", url="https://v.example/free")
        self.video_premium = Video.objects.create(
            title="Premium vid", url="https://v.example/premium", is_premium=True
        )

    def test_can_access_lesson_rules(self):
        self.assertTrue(can_access_lesson(self.free_user, self.lesson_free))
        self.assertFalse(can_access_lesson(self.free_user, self.lesson_premium))
        self.assertTrue(can_access_lesson(self.premium_user, self.lesson_premium))

    def test_lesson_detail_blocks_free_user(self):
        self.client.force_authenticate(user=self.free_user)
        url = f"/api/learning/lessons/{self.lesson_premium.pk}/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data.get("code"), "premium_required")

    def test_video_list_hides_premium_url(self):
        self.client.force_authenticate(user=self.free_user)
        resp = self.client.get("/api/learning/videos/")
        self.assertEqual(resp.status_code, 200)
        by_id = {v["id"]: v for v in resp.data}
        self.assertEqual(by_id[self.video_free.id]["url"], "https://v.example/free")
        self.assertEqual(by_id[self.video_premium.id]["url"], "")
        self.assertTrue(by_id[self.video_premium.id]["locked"])

    def test_video_list_shows_url_for_premium_user(self):
        self.client.force_authenticate(user=self.premium_user)
        resp = self.client.get("/api/learning/videos/")
        by_id = {v["id"]: v for v in resp.data}
        self.assertEqual(by_id[self.video_premium.id]["url"], "https://v.example/premium")
        self.assertFalse(by_id[self.video_premium.id]["locked"])

    def test_course_detail_redacts_premium_lessons(self):
        self.client.force_authenticate(user=self.free_user)
        resp = self.client.get(f"/api/learning/courses/{self.course.slug}/")
        self.assertEqual(resp.status_code, 200)
        by_id = {l["id"]: l for l in resp.data["lessons"]}
        self.assertEqual(by_id[self.lesson_free.id]["content"], "intro")
        self.assertFalse(by_id[self.lesson_free.id]["locked"])
        self.assertEqual(by_id[self.lesson_premium.id]["content"], "")
        self.assertTrue(by_id[self.lesson_premium.id]["locked"])

    def test_complete_lesson_blocks_premium(self):
        self.client.force_authenticate(user=self.free_user)
        resp = self.client.post(
            f"/api/learning/courses/{self.course.slug}/complete-lesson/",
            {"lesson_id": self.lesson_premium.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.data.get("code"), "premium_required")
