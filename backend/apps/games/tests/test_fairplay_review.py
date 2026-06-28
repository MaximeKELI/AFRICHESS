from django.contrib.auth import get_user_model

from apps.games.fairplay_review import (
    compute_peer_score_delta,
    open_review_case,
    peer_comparison,
    user_has_active_matchmaking_block,
)
from apps.games.fairplay_service import persist_fairplay_report
from apps.games.models import FairPlayReport, FairPlayReviewCase, FairPlaySanction, Game

from django.test import TestCase

User = get_user_model()


class FairPlayReviewTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="w_rev", password="x")
        self.black = User.objects.create_user(username="b_rev", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )

    def _report(self, user, score: float, verdict: str) -> FairPlayReport:
        return persist_fairplay_report(
            self.game,
            user,
            {
                "overall_score": score,
                "verdict": verdict,
                "signals": [],
                "move_evals": [],
                "engine_top1_rate": score / 100,
                "engine_top3_rate": score / 100,
                "avg_centipawn_loss": 40.0,
                "accuracy_estimate": 85.0,
            },
        )

    def test_open_review_case_for_flagged_verdict(self):
        report = self._report(self.white, 72.0, "suspicious")
        case = open_review_case(report)
        self.assertIsNotNone(case)
        self.assertEqual(case.status, FairPlayReviewCase.Status.PENDING)

    def test_no_case_for_clean_verdict(self):
        report = self._report(self.white, 5.0, "clean")
        self.assertIsNone(open_review_case(report))

    def test_peer_comparison_delta(self):
        self._report(self.white, 80.0, "likely_cheat")
        self._report(self.black, 12.0, "clean")
        comp = peer_comparison(self.game)
        self.assertEqual(len(comp["players"]), 2)
        self.assertGreater(comp["peer_delta"]["overall_score"], 60.0)
        self.assertTrue(comp["peer_delta"]["asymmetric_engine_use"])

    def test_matchmaking_block_sanction(self):
        report = self._report(self.white, 90.0, "likely_cheat")
        case = open_review_case(report)
        from apps.games.fairplay_review import apply_review_decision

        staff = User.objects.create_user(username="staff", password="x", is_staff=True)
        apply_review_decision(
            case.id,
            staff,
            status="confirmed",
            decision="matchmaking_block",
            notes="test",
            suspend_days=3,
        )
        self.assertTrue(user_has_active_matchmaking_block(self.white))
        self.assertEqual(FairPlaySanction.objects.filter(user=self.white, is_active=True).count(), 1)
