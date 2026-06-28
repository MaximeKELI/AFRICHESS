"""Tests API admin Fair Play et workflow de revue humaine."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.fairplay_review import (
    apply_review_decision,
    fairplay_queue_overview,
    game_fairplay_detail,
    list_review_queue,
    open_review_case,
    user_fairplay_restrictions,
    user_has_active_matchmaking_block,
)
from apps.games.fairplay_service import analyze_and_store, persist_fairplay_report
from apps.games.models import (
    FairPlayReport,
    FairPlayReviewCase,
    FairPlaySanction,
    Game,
    Notification,
)

User = get_user_model()


class FairPlayAdminServiceTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(username="staff_fp", password="x", is_staff=True)
        self.white = User.objects.create_user(username="w_admin", password="x")
        self.black = User.objects.create_user(username="b_admin", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            is_rated=True,
            result="1-0",
        )

    def _flagged_report(self, user, score: float, verdict: str, top1: float = 0.7):
        return persist_fairplay_report(
            self.game,
            user,
            {
                "overall_score": score,
                "verdict": verdict,
                "signals": [{"code": "ENGINE_TOP1_HIGH", "score": 70, "weight": 1.2, "detail": "x"}],
                "move_evals": [],
                "engine_top1_rate": top1,
                "engine_top3_rate": top1 + 0.1,
                "avg_centipawn_loss": 15.0,
                "accuracy_estimate": 95.0,
            },
        )

    def test_persist_opens_review_case(self):
        report = self._flagged_report(self.white, 78.0, "suspicious")
        case = FairPlayReviewCase.objects.filter(report=report).first()
        self.assertIsNotNone(case)
        self.assertEqual(case.status, FairPlayReviewCase.Status.PENDING)

    def test_review_case_idempotent(self):
        report = self._flagged_report(self.white, 80.0, "likely_cheat")
        c1 = open_review_case(report)
        c2 = open_review_case(report)
        self.assertEqual(c1.id, c2.id)

    def test_peer_comparison_in_game_detail(self):
        self._flagged_report(self.white, 85.0, "likely_cheat", top1=0.82)
        self._flagged_report(self.black, 8.0, "clean", top1=0.18)
        detail = game_fairplay_detail(str(self.game.id))
        self.assertIsNotNone(detail)
        self.assertEqual(len(detail["peer_comparison"]["players"]), 2)
        self.assertTrue(detail["peer_comparison"]["peer_delta"]["asymmetric_engine_use"])

    def test_dismiss_case_no_sanction(self):
        report = self._flagged_report(self.white, 60.0, "review")
        case = open_review_case(report)
        result = apply_review_decision(
            case.id,
            self.staff,
            status="dismissed",
            decision="none",
            notes="Faux positif — joueur fort",
        )
        self.assertTrue(result["ok"])
        case.refresh_from_db()
        self.assertEqual(case.status, FairPlayReviewCase.Status.DISMISSED)
        self.assertFalse(FairPlaySanction.objects.filter(user=self.white, is_active=True).exists())

    def test_warn_creates_notification(self):
        report = self._flagged_report(self.white, 70.0, "suspicious")
        case = open_review_case(report)
        apply_review_decision(
            case.id,
            self.staff,
            status="confirmed",
            decision="warn",
            notes="Premier avertissement",
        )
        self.assertTrue(
            Notification.objects.filter(user=self.white, title__icontains="Avertissement").exists()
        )

    def test_temp_suspend_deactivates_user(self):
        report = self._flagged_report(self.white, 92.0, "likely_cheat")
        case = open_review_case(report)
        apply_review_decision(
            case.id,
            self.staff,
            status="confirmed",
            decision="suspend_temp",
            notes="Triche confirmée",
            suspend_days=2,
        )
        self.white.refresh_from_db()
        self.assertFalse(self.white.is_active)
        restr = user_fairplay_restrictions(self.white)
        self.assertTrue(restr["suspended"])

    def test_matchmaking_block_expires(self):
        report = self._flagged_report(self.white, 88.0, "likely_cheat")
        case = open_review_case(report)
        apply_review_decision(
            case.id,
            self.staff,
            status="confirmed",
            decision="matchmaking_block",
            suspend_days=1,
        )
        self.assertTrue(user_has_active_matchmaking_block(self.white))
        sanction = FairPlaySanction.objects.get(user=self.white, is_active=True)
        FairPlaySanction.objects.filter(pk=sanction.pk).update(
            until=timezone.now() - timedelta(hours=1)
        )
        self.assertFalse(user_has_active_matchmaking_block(self.white))

    @patch("apps.games.fairplay_service.run_fairplay_analysis")
    def test_analyze_and_store_downgrades_verdict_with_clean_history(self, mock_run):
        for i in range(11):
            g = Game.objects.create(
                white_player=self.white,
                black_player=self.black,
                status=Game.Status.COMPLETED,
                mode=Game.Mode.BLITZ,
                is_rated=True,
            )
            persist_fairplay_report(
                g,
                self.white,
                {
                    "overall_score": 5.0,
                    "verdict": "clean",
                    "signals": [],
                    "move_evals": [],
                    "engine_top1_rate": 0.3,
                    "engine_top3_rate": 0.4,
                    "avg_centipawn_loss": 40.0,
                    "accuracy_estimate": 80.0,
                },
            )
        mock_run.return_value = {
            "overall_score": 70.0,
            "verdict": "suspicious",
            "signals": [],
            "move_evals": [],
            "engine_top1_rate": 0.6,
            "engine_top3_rate": 0.7,
            "avg_centipawn_loss": 20.0,
            "accuracy_estimate": 92.0,
        }
        game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )
        report = analyze_and_store(game, self.white)
        self.assertEqual(report.verdict, "review")

    def test_queue_overview_counts(self):
        self._flagged_report(self.white, 75.0, "suspicious")
        open_review_case(FairPlayReport.objects.get(user=self.white))
        overview = fairplay_queue_overview()
        self.assertGreaterEqual(overview["pending_cases"], 1)

    def test_list_review_queue_filter(self):
        self._flagged_report(self.white, 80.0, "likely_cheat")
        open_review_case(FairPlayReport.objects.get(user=self.white))
        data = list_review_queue(status="pending", limit=10)
        self.assertGreaterEqual(data["total"], 1)
        self.assertEqual(data["cases"][0]["report"]["verdict"], "likely_cheat")


class FairPlayAdminAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(username="staff_api", password="x", is_staff=True)
        self.user = User.objects.create_user(username="player_api", password="x")
        self.white = User.objects.create_user(username="w_api", password="x")
        self.black = User.objects.create_user(username="b_api", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )
        report = persist_fairplay_report(
            self.game,
            self.white,
            {
                "overall_score": 82.0,
                "verdict": "suspicious",
                "signals": [],
                "move_evals": [],
                "engine_top1_rate": 0.75,
                "engine_top3_rate": 0.8,
                "avg_centipawn_loss": 18.0,
                "accuracy_estimate": 93.0,
            },
        )
        self.case = open_review_case(report)

    def test_staff_can_access_overview(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get("/api/games/admin/fairplay/overview/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("pending_cases", res.data)

    def test_non_staff_forbidden(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/games/admin/fairplay/overview/")
        self.assertEqual(res.status_code, 403)

    def test_game_detail_peer_comparison(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.get(f"/api/games/admin/fairplay/games/{self.game.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("peer_comparison", res.data)

    def test_decide_endpoint(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(
            f"/api/games/admin/fairplay/cases/{self.case.id}/decide/",
            {"status": "dismissed", "decision": "none", "notes": "OK"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["ok"])
