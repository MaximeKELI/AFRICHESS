"""Tests échange OAuth one-time code."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.users.oauth_exchange import consume_oauth_code, create_oauth_code

User = get_user_model()


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
)
class OAuthExchangeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="oauth_user", password="x")

    def test_exchange_valid_code(self):
        code = create_oauth_code(self.user)
        resp = self.client.post("/api/users/auth/oauth/exchange/", {"code": code}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
        self.assertIsNone(consume_oauth_code(code))

    def test_exchange_invalid_code(self):
        resp = self.client.post("/api/users/auth/oauth/exchange/", {"code": "bad-code"}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_code_single_use(self):
        code = create_oauth_code(self.user)
        self.assertIsNotNone(consume_oauth_code(code))
        self.assertIsNone(consume_oauth_code(code))
