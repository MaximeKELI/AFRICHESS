from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
import base64
import tempfile

from apps.users.avatar_utils import uploaded_avatar_url

User = get_user_model()

# 1×1 PNG valide
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class AvatarUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="av_u", password="x")
        self.client.force_authenticate(self.user)

    def test_upload_avatar_multipart(self):
        img = SimpleUploadedFile("me.png", TINY_PNG, content_type="image/png")
        res = self.client.patch(
            "/api/users/profile/",
            {"avatar": img},
            format="multipart",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.avatar.name)
        self.assertIsNotNone(uploaded_avatar_url(self.user))

    def test_update_avatar_preset(self):
        res = self.client.patch(
            "/api/users/profile/",
            {"avatar_preset": "avatar-5"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar_preset, "avatar-5")

    def test_preset_change_clears_uploaded_file(self):
        self.user.avatar = SimpleUploadedFile("old.png", TINY_PNG, content_type="image/png")
        self.user.save()
        res = self.client.patch(
            "/api/users/profile/",
            {"avatar_preset": "avatar-3"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar_preset, "avatar-3")
        self.assertFalse(self.user.avatar)


class UsersApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="u1", password="TestPass123!")

    def test_register_creates_user(self):
        res = self.client.post(
            "/api/users/register/",
            {
                "username": "newbie",
                "email": "newbie@test.com",
                "password": "TestPass123!",
                "password_confirm": "TestPass123!",
                "country": "SN",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["username"], "newbie")
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_profile_requires_auth(self):
        res = self.client.get("/api/users/profile/")
        self.assertEqual(res.status_code, 401)
        self.client.force_authenticate(self.user)
        res2 = self.client.get("/api/users/profile/")
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data["username"], "u1")
