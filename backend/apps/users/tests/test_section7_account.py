"""Tests approfondis Section 7 — Compte / Admin."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.games.fairplay_review import apply_review_decision, open_review_case
from apps.games.fairplay_service import persist_fairplay_report
from apps.games.models import FairPlayReviewCase, Game
from apps.users.totp_service import generate_totp_secret, verify_totp

User = get_user_model()


class PasswordChangeGuardTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="pwd_u", password="OldPass123!", email="pwd@ex.com"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_password_change_requires_old_password(self):
        r = self.client.post(
            "/api/auth/password/change/",
            {"new_password1": "NewPass123!", "new_password2": "NewPass123!"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass123!"))

    def test_password_change_with_old_password(self):
        r = self.client.post(
            "/api/auth/password/change/",
            {
                "old_password": "OldPass123!",
                "new_password1": "NewPass456!",
                "new_password2": "NewPass456!",
            },
            format="json",
        )
        self.assertIn(r.status_code, (200, 204))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass456!"))


class LoginPrivacyTests(TestCase):
    def setUp(self):
        User.objects.create_user(username="dup_a", password="x", email="same@ex.com")
        User.objects.create_user(username="dup_b", password="x", email="same@ex.com")
        self.client = APIClient()

    def test_duplicate_email_login_hides_usernames(self):
        r = self.client.post(
            "/api/auth/login/",
            {"username": "same@ex.com", "password": "x"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        body = str(r.data)
        self.assertNotIn("dup_a", body)
        self.assertNotIn("dup_b", body)


class TotpPasswordRequiredTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="totp_u", password="Secret1!")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_setup_requires_password(self):
        r = self.client.post("/api/users/security/2fa/setup/", {}, format="json")
        self.assertEqual(r.status_code, 400)
        r2 = self.client.post(
            "/api/users/security/2fa/setup/",
            {"password": "Secret1!"},
            format="json",
        )
        self.assertEqual(r2.status_code, 200)
        self.assertIn("secret", r2.data)


class FairPlayStaffProtectTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="fp_staff", password="x", is_staff=True
        )
        self.target_staff = User.objects.create_user(
            username="fp_target", password="x", is_staff=True
        )
        self.other = User.objects.create_user(username="fp_peer", password="x")
        self.game = Game.objects.create(
            white_player=self.target_staff,
            black_player=self.other,
            status=Game.Status.COMPLETED,
            result="1-0",
            is_rated=True,
        )
        report = persist_fairplay_report(
            self.game,
            self.target_staff,
            {
                "overall_score": 90.0,
                "verdict": "likely_cheat",
                "signals": [],
                "move_evals": [],
                "engine_top1_rate": 0.9,
                "engine_top3_rate": 0.95,
                "avg_centipawn_loss": 5.0,
                "accuracy_estimate": 99.0,
            },
        )
        self.case = open_review_case(report)

    def test_cannot_suspend_staff(self):
        result = apply_review_decision(
            self.case.id,
            self.staff,
            status=FairPlayReviewCase.Status.CONFIRMED,
            decision=FairPlayReviewCase.Decision.SUSPEND_PERM,
        )
        self.assertIn("error", result)
        self.target_staff.refresh_from_db()
        self.assertTrue(self.target_staff.is_active)


class AccountLifecycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="life_u", password="CloseMe1!", email="life@ex.com"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_export_account(self):
        r = self.client.get("/api/users/account/export/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("profile", r.data)
        self.assertIn("exported_at", r.data)

    def test_close_account(self):
        r = self.client.post(
            "/api/users/account/close/",
            {"password": "CloseMe1!", "confirm": "DELETE"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertTrue(self.user.username.startswith("deleted_"))


class ProfileCountryValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="cty_u", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_invalid_country_rejected(self):
        r = self.client.patch(
            "/api/users/profile/",
            {"country": "ZZ"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
