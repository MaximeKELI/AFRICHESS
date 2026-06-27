"""Tests API notifications REST."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.notifications.models import Notification

User = get_user_model()


class NotificationApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="notif_api", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        Notification.objects.create(
            user=self.user,
            type=Notification.Type.SYSTEM,
            title="Welcome",
            body="Hello",
        )

    def test_list_notifications(self):
        res = self.client.get("/api/notifications/")
        self.assertEqual(res.status_code, 200)
        rows = res.data.get("results", res.data)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["title"], "Welcome")

    def test_mark_read(self):
        n = Notification.objects.get(user=self.user)
        res = self.client.post(f"/api/notifications/{n.id}/read/")
        self.assertEqual(res.status_code, 200)
        n.refresh_from_db()
        self.assertTrue(n.is_read)
