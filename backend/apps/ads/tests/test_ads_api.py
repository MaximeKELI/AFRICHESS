from datetime import timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ads.models import AdSlide

User = get_user_model()

# Minimal 1x1 PNG
PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _png(name="ad.png"):
    return SimpleUploadedFile(name, PNG_1X1, content_type="image/png")


class AdSlideApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            username="staff_ads", password="pass12345", is_staff=True
        )
        self.user = User.objects.create_user(username="player_ads", password="pass12345")

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
            {"title": "Promo", "image": _png(), "link_url": "https://example.com", "is_active": True, "order": 3},
            format="multipart",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["title"], "Promo")
        self.assertTrue(res.data["image_url"])
