"""Tests conformité Fair Play — consentement, engine_unavailable, sanctions, recours."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.fairplay_review import expire_fairplay_sanctions, submit_fairplay_appeal
from apps.games.fairplay_service import analyze_and_store, run_fairplay_analysis
from apps.games.fairplay_telemetry import sanitize_telemetry_patch, user_has_fairplay_consent
from apps.games.models import (
    FairPlayAppeal,
    FairPlayAuditLog,
    FairPlayReport,
    FairPlayReviewCase,
    FairPlaySanction,
    FairPlayUserConsent,
    Game,
    Move,
)

User = get_user_model()


class FairPlayTelemetryValidationTests(TestCase):
    def test_sanitize_caps_spoofed_values(self):
        patch = sanitize_telemetry_patch(
            {
                "tab_blur": 999,
                "copy_paste": -5,
                "mouse_entropy": 42.0,
                "focus_loss_ms": 999_999,
            }
        )
        self.assertEqual(patch["tab_blur"], 4)
        self.assertEqual(patch["copy_paste"], 0)
        self.assertEqual(patch["mouse_entropy"], 1.0)
        self.assertEqual(patch["focus_loss_ms"], 120_000)

    def test_consent_required_for_telemetry(self):
        user = User.objects.create_user(username="noconsent", password="x")
        game = Game.objects.create(status=Game.Status.ACTIVE, mode=Game.Mode.BLITZ)
        self.assertFalse(user_has_fairplay_consent(user))
        from apps.games.fairplay_service import merge_telemetry

        row = merge_telemetry(game, user, {"tab_blur": 3})
        self.assertEqual(row.data or {}, {})


class FairPlayEngineUnavailableTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="w_eng", password="x")
        self.black = User.objects.create_user(username="b_eng", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )
        Move.objects.create(
            game=self.game,
            move_number=1,
            san="e4",
            uci="e2e4",
            fen_after=self.game.fen,
            played_by_white=True,
        )

    @patch("apps.games.board_native.fairplay_analyze_inprocess", return_value=None)
    @patch("apps.games.fairplay_service._fairplay_bin", return_value=None)
    @patch("apps.games.fairplay_service._notify_ops_engine_failure")
    def test_analyze_persists_engine_unavailable(self, mock_notify, _mock_bin, _mock_inproc):
        report = analyze_and_store(self.game, self.white)
        self.assertIsNotNone(report)
        self.assertEqual(report.verdict, FairPlayReport.Verdict.ENGINE_UNAVAILABLE)
        mock_notify.assert_called_once()
        self.assertTrue(
            FairPlayReviewCase.objects.filter(report=report).exists()
        )

    @patch("apps.games.board_native.fairplay_analyze_inprocess", return_value=None)
    @patch("apps.games.fairplay_service._fairplay_bin", return_value=None)
    def test_run_fairplay_returns_error_tuple(self, _mock_bin, _mock_inproc):
        result, error = run_fairplay_analysis(self.game, self.white)
        self.assertEqual(result["verdict"], "engine_unavailable")
        self.assertIsNotNone(error)


class FairPlaySanctionExpiryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="suspended", password="x", is_active=False)
        self.staff = User.objects.create_user(username="staff", password="x", is_staff=True)
        self.white = User.objects.create_user(username="w2", password="x")
        self.black = User.objects.create_user(username="b2", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )
        report = FairPlayReport.objects.create(
            game=self.game,
            user=self.user,
            verdict=FairPlayReport.Verdict.SUSPICIOUS,
            overall_score=80,
        )
        case = FairPlayReviewCase.objects.create(report=report)
        FairPlaySanction.objects.create(
            user=self.user,
            review_case=case,
            sanction_type=FairPlaySanction.SanctionType.SUSPEND_TEMP,
            until=timezone.now() - timedelta(hours=1),
            is_active=True,
            created_by=self.staff,
        )

    def test_expire_reactivates_user(self):
        stats = expire_fairplay_sanctions()
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertEqual(stats["reactivated_users"], 1)
        self.assertEqual(stats["expired_sanctions"], 1)


class FairPlayConsentApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="consent_user", password="x")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_consent_flow(self):
        res = self.client.get("/api/games/fairplay/status/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["consent_given"])

        res = self.client.post("/api/games/fairplay/consent/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["ok"])
        self.assertTrue(user_has_fairplay_consent(self.user))

        res = self.client.get("/api/games/fairplay/status/")
        self.assertTrue(res.data["consent_given"])


class FairPlayAppealTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="appealer", password="x")
        self.staff = User.objects.create_user(username="mod", password="x", is_staff=True)
        self.white = User.objects.create_user(username="w3", password="x")
        self.black = User.objects.create_user(username="b3", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )
        report = FairPlayReport.objects.create(
            game=self.game,
            user=self.user,
            verdict=FairPlayReport.Verdict.SUSPICIOUS,
            overall_score=70,
        )
        self.case = FairPlayReviewCase.objects.create(
            report=report,
            status=FairPlayReviewCase.Status.CONFIRMED,
            decision=FairPlayReviewCase.Decision.WARN,
        )

    def test_submit_appeal(self):
        result = submit_fairplay_appeal(self.user, self.case.id, "Je n'ai pas triché.")
        self.assertTrue(result.get("ok"))
        self.assertEqual(FairPlayAppeal.objects.filter(user=self.user).count(), 1)

    def test_admin_decision_creates_audit_log(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/games/admin/fairplay/cases/{self.case.id}/decide/",
            {"status": "dismissed", "decision": "none", "notes": "clean"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(
            FairPlayAuditLog.objects.filter(
                action=FairPlayAuditLog.Action.DECIDE_CASE,
                staff=self.staff,
            ).exists()
        )
