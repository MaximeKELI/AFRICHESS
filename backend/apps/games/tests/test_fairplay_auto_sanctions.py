"""Tests sanctions Fair Play automatiques (graduées)."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.games.fairplay_auto_policy import evaluate_auto_sanction, maybe_apply_auto_sanction
from apps.games.fairplay_review import open_review_case, user_has_active_matchmaking_block
from apps.games.fairplay_service import persist_fairplay_report
from apps.games.models import FairPlayAuditLog, FairPlayReport, FairPlayReviewCase, FairPlaySanction, Game

User = get_user_model()


def _make_game(white, black):
    return Game.objects.create(
        white_player=white,
        black_player=black,
        mode="blitz",
        is_rated=True,
        status=Game.Status.COMPLETED,
    )


def _flagged_result(**overrides):
    base = {
        "overall_score": 85.0,
        "verdict": FairPlayReport.Verdict.LIKELY_CHEAT,
        "signals": [{"name": "engine_top1", "severity": "high"}],
        "move_evals": [],
        "engine_top1_rate": 0.72,
        "engine_top3_rate": 0.85,
        "avg_centipawn_loss": 12.0,
        "accuracy_estimate": 96.0,
    }
    base.update(overrides)
    return base


@override_settings(
    FAIRPLAY_AUTO_SANCTIONS_ENABLED=True,
    FAIRPLAY_AUTO_SANCTIONS_SHADOW=False,
    FAIRPLAY_AUTO_MIN_BASELINE_GAMES=10,
)
class FairPlayAutoSanctionTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="fp_auto_w", password="x")
        self.black = User.objects.create_user(username="fp_auto_b", password="x")
        self.game = _make_game(self.white, self.black)

    @patch("apps.games.fairplay_auto_policy.player_baseline")
    def test_auto_matchmaking_block_on_likely_cheat(self, mock_baseline):
        mock_baseline.return_value = {"games_analyzed": 12, "avg_overall_score": 15.0}
        report = persist_fairplay_report(self.game, self.white, _flagged_result())
        case = FairPlayReviewCase.objects.get(report=report)
        case.peer_score_delta = 25.0
        case.save(update_fields=["peer_score_delta"])

        rec = evaluate_auto_sanction(report, case)
        self.assertIsNotNone(rec)
        self.assertEqual(rec.decision, FairPlayReviewCase.Decision.MATCHMAKING_BLOCK)

        result = maybe_apply_auto_sanction(report, case)
        self.assertTrue(result.get("ok"))
        case.refresh_from_db()
        self.assertEqual(case.decision_source, "auto")
        self.assertEqual(case.status, FairPlayReviewCase.Status.CONFIRMED)
        self.assertTrue(user_has_active_matchmaking_block(self.white))
        self.assertTrue(
            FairPlaySanction.objects.filter(user=self.white, is_automated=True, is_active=True).exists()
        )
        self.assertTrue(
            FairPlayAuditLog.objects.filter(action=FairPlayAuditLog.Action.AUTO_SANCTION).exists()
        )

    @patch("apps.games.fairplay_auto_policy.player_baseline")
    def test_shadow_mode_logs_without_sanction(self, mock_baseline):
        mock_baseline.return_value = {"games_analyzed": 12, "avg_overall_score": 15.0}
        with override_settings(FAIRPLAY_AUTO_SANCTIONS_SHADOW=True, FAIRPLAY_AUTO_SANCTIONS_ENABLED=False):
            report = persist_fairplay_report(self.game, self.white, _flagged_result())
            case = FairPlayReviewCase.objects.get(report=report)
            case.peer_score_delta = 25.0
            case.save(update_fields=["peer_score_delta"])
            maybe_apply_auto_sanction(report, case)

        self.assertFalse(FairPlaySanction.objects.filter(user=self.white).exists())
        self.assertTrue(
            FairPlayAuditLog.objects.filter(action=FairPlayAuditLog.Action.AUTO_RECOMMEND).exists()
        )

    @patch("apps.games.fairplay_auto_policy.player_baseline")
    def test_warn_on_repeat_flags(self, mock_baseline):
        mock_baseline.return_value = {"games_analyzed": 12, "avg_overall_score": 15.0}
        old_game = _make_game(self.white, self.black)
        old_report = persist_fairplay_report(
            old_game,
            self.white,
            _flagged_result(verdict=FairPlayReport.Verdict.SUSPICIOUS, overall_score=70.0),
        )
        old_report.analyzed_at = timezone.now() - timedelta(days=5)
        old_report.save(update_fields=["analyzed_at"])

        report = persist_fairplay_report(
            self.game,
            self.white,
            _flagged_result(verdict=FairPlayReport.Verdict.SUSPICIOUS, overall_score=72.0),
        )
        case = FairPlayReviewCase.objects.get(report=report)
        case.peer_score_delta = 5.0
        case.save(update_fields=["peer_score_delta"])

        rec = evaluate_auto_sanction(report, case)
        self.assertIsNotNone(rec)
        self.assertEqual(rec.decision, FairPlayReviewCase.Decision.WARN)

    @patch("apps.games.fairplay_auto_policy.user_is_fairplay_exempt", return_value=True)
    def test_exempt_user_skipped(self, _exempt):
        report = persist_fairplay_report(self.game, self.white, _flagged_result())
        case = open_review_case(report)
        self.assertIsNone(evaluate_auto_sanction(report, case))
