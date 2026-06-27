"""Tests révision espacée Chessable."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.learning.models import LineReview, StudyLine
from apps.learning.study_review import get_due_lines, schedule_review

User = get_user_model()


class StudyReviewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="study_u", password="x")
        self.line = StudyLine.objects.create(
            user=self.user,
            name="Italian",
            moves_uci=["e2e4", "e7e5", "g1f3"],
        )

    def test_schedule_review_creates_entry(self):
        review = schedule_review(self.user, self.line, quality=5)
        self.assertEqual(review.repetitions, 1)
        self.assertGreater(review.next_review, timezone.now())

    def test_failed_review_resets(self):
        schedule_review(self.user, self.line, quality=5)
        review = schedule_review(self.user, self.line, quality=1)
        self.assertEqual(review.repetitions, 0)
        self.assertEqual(review.interval_days, 1)

    def test_get_due_lines(self):
        schedule_review(self.user, self.line, quality=5)
        LineReview.objects.filter(user=self.user).update(next_review=timezone.now())
        due = get_due_lines(self.user)
        self.assertEqual(len(due), 1)
        self.assertEqual(due[0].id, self.line.id)
