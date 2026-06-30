from django.test import TestCase
from rest_framework.test import APIClient


class HealthCheckTests(TestCase):
    def test_health_ok(self):
        client = APIClient()
        resp = client.get("/api/health/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ok")
        self.assertTrue(resp.json()["database"])
