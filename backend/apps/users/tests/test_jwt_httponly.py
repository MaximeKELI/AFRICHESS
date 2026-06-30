"""Tests cookies HttpOnly refresh JWT (Phase 10)."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@override_settings(JWT_REFRESH_HTTPONLY=True)
class HttpOnlyRefreshCookieTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="cookieuser", password="pass12345!")
        self.client = APIClient()

    def test_login_sets_httponly_refresh_cookie(self):
        res = self.client.post(
            "/api/auth/login/",
            {"username": "cookieuser", "password": "pass12345!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertNotIn("refresh", res.data)
        self.assertIn("refresh_token", res.cookies)
        cookie = res.cookies["refresh_token"]
        self.assertTrue(cookie["httponly"])

    def test_refresh_from_cookie_without_body(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.cookies["refresh_token"] = str(refresh)
        res = self.client.post("/api/auth/token/refresh/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertNotIn("refresh", res.data)
        self.assertIn("refresh_token", res.cookies)

    def test_logout_clears_cookie(self):
        refresh = RefreshToken.for_user(self.user)
        access = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.client.cookies["refresh_token"] = str(refresh)
        res = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        cleared = res.cookies.get("refresh_token")
        self.assertIsNotNone(cleared)
        self.assertEqual(cleared.value, "")
