"""Tests connexion avec TOTP."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.users.totp_service import generate_totp_secret, totp_code

User = get_user_model()


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "apps.users.authentication.AfrichessJWTAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_THROTTLE_CLASSES": [],
    }
)
class TotpLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="totp_user", password="secret123")
        self.user.totp_secret = generate_totp_secret()
        self.user.totp_enabled = True
        self.user.save(update_fields=["totp_secret", "totp_enabled"])

    def test_login_requires_totp_code(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "totp_user", "password": "secret123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertTrue(
            "TOTP_REQUIRED" in str(body.get("non_field_errors", body))
            or "TOTP_REQUIRED" in str(body)
        )

    def test_login_with_valid_totp(self):
        code = totp_code(self.user.totp_secret)
        resp = self.client.post(
            "/api/auth/login/",
            {
                "username": "totp_user",
                "password": "secret123",
                "totp_code": code,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
