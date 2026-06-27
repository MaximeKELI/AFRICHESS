"""Tests mode vacances."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

User = get_user_model()


class VacationModeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="vac_u", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_enable_vacation(self):
        res = self.client.post("/api/users/vacation/", {"days": 7}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.data["vacation_until"])
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.vacation_until)
        self.assertGreater(self.user.vacation_until, timezone.now())

    def test_disable_vacation(self):
        self.client.post("/api/users/vacation/", {"days": 7}, format="json")
        res = self.client.delete("/api/users/vacation/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["vacation_until"])
