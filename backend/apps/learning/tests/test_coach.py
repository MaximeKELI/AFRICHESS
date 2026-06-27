"""Tests coach personnalisé."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.learning.coach import generate_coach_payload, generate_coach_tips, generate_training_plan
from apps.users.models import UserStats

User = get_user_model()


class CoachTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="coach_u", password="x")
        UserStats.objects.create(user=self.user, games_played=10, games_won=3, puzzles_solved=2)

    def test_generate_coach_tips_returns_list(self):
        tips = generate_coach_tips(self.user)
        self.assertIsInstance(tips, list)
        self.assertGreater(len(tips), 0)
        self.assertIn("message", tips[0])
        self.assertIn("category", tips[0])

    def test_training_plan_has_entries(self):
        plan = generate_training_plan(self.user)
        self.assertIsInstance(plan, list)
        self.assertGreater(len(plan), 0)
        self.assertIn("day", plan[0])
        self.assertIn("focus", plan[0])

    def test_coach_payload_structure(self):
        payload = generate_coach_payload(self.user)
        self.assertIn("tips", payload)
        self.assertIn("training_plan", payload)
