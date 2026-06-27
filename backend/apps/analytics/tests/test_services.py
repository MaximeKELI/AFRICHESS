"""Tests analytics — agrégations admin."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.analytics.models import UserActivityEvent
from apps.analytics.services import (
    platform_overview,
    registration_breakdown,
    user_activity_summary,
    user_timeline,
)

User = get_user_model()


class AnalyticsServicesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="analytics_u",
            email="a@test.com",
            password="x",
            country="SN",
        )
        UserActivityEvent.objects.create(
            user=self.user,
            event_type=UserActivityEvent.EventType.PAGE_VIEW,
            path="/play",
        )
        UserActivityEvent.objects.create(
            user=self.user,
            event_type=UserActivityEvent.EventType.CLICK,
            path="/play",
            element="btn-start",
        )

    def test_platform_overview_structure(self):
        data = platform_overview()
        self.assertIn("users", data)
        self.assertIn("games", data)
        self.assertIn("events", data)
        self.assertGreaterEqual(data["users"]["total"], 1)
        self.assertIn("charts", data)

    def test_registration_breakdown(self):
        data = registration_breakdown()
        self.assertIn("by_country", data)
        countries = {row["country"]: row["count"] for row in data["by_country"]}
        self.assertGreaterEqual(countries.get("SN", 0), 1)

    def test_user_activity_summary(self):
        data = user_activity_summary(self.user.id)
        self.assertIsNotNone(data)
        assert data is not None
        self.assertEqual(data["user"]["username"], "analytics_u")
        self.assertGreaterEqual(data["activity"]["events_total"], 2)

    def test_user_activity_summary_missing(self):
        self.assertIsNone(user_activity_summary(999999))

    def test_user_timeline(self):
        data = user_timeline(self.user.id, limit=10)
        self.assertEqual(data["total"], 2)
        self.assertEqual(len(data["events"]), 2)
