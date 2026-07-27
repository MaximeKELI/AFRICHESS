import tempfile
from datetime import timedelta
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ads.models import AdSlide

User = get_user_model()

# Valid 1×1 PNG (Pillow-accepted)
PNG_1X1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)

MEDIA_ROOT = tempfile.mkdtemp(prefix="africhess_ads_test_")


def _png(name="ad.png"):
    return SimpleUploadedFile(name, PNG_1X1, content_type="image/png")


@override_settings(MEDIA_ROOT=MEDIA_ROOT)
class AdSlideApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username="staff_ads", password="pass12345", is_staff=True
        )
        self.user = User.objects.create_user(username="player_ads", password="pass12345")
        Path(MEDIA_ROOT).mkdir(parents=True, exist_ok=True)

    def test_public_lists_only_active_in_window(self):
        AdSlide.objects.create(title="Live", image=_png("a.png"), is_active=True, order=0)
        AdSlide.objects.create(title="Off", image=_png("b.png"), is_active=False, order=1)
        AdSlide.objects.create(
            title="Future",
            image=_png("c.png"),
            is_active=True,
            starts_at=timezone.now() + timedelta(days=1),
            order=2,
        )
        res = self.client.get("/api/ads/active/")
        self.assertEqual(res.status_code, 200)
        titles = [s["title"] for s in res.data]
        self.assertEqual(titles, ["Live"])

    def test_staff_can_create_anonymous_cannot(self):
        res = self.client.post(
            "/api/ads/admin/slides/",
            {"title": "Promo", "image": _png(), "is_active": True, "order": 0},
            format="multipart",
        )
        self.assertEqual(res.status_code, 401)

        self.client.force_authenticate(self.user)
        res = self.client.post(
            "/api/ads/admin/slides/",
            {"title": "Promo", "image": _png(), "is_active": True, "order": 0},
            format="multipart",
        )
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(self.staff)
        res = self.client.post(
            "/api/ads/admin/slides/",
            {
                "title": "Promo",
                "image": _png(),
                "link_url": "https://example.com",
                "is_active": True,
                "order": 3,
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["title"], "Promo")
        self.assertTrue(res.data["image_url"])
