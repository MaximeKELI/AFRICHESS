"""Tests AFRICHESS Integrity Engine (AIE)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.games.fairplay_integrity import (
    certificate_level,
    compute_live_move_score,
    fuse_analysis_fairplay,
    get_or_create_profile,
    record_live_move_integrity,
    update_integrity_after_game,
    user_in_shadow_pool,
)
from apps.games.models import FairPlayIntegrityProfile, FairPlayReport, Game

User = get_user_model()


class FairPlayIntegrityTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="int_w", password="x")
        self.black = User.objects.create_user(username="int_b", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.COMPLETED,
            is_rated=True,
            is_vs_ai=False,
            started_at=timezone.now(),
        )

    def test_certificate_levels(self):
        self.assertEqual(certificate_level(96, 10), "trusted")
        self.assertEqual(certificate_level(70, 0), "bronze")

    def test_live_move_score_penalizes_drift(self):
        score = compute_live_move_score(
            think_ms=100,
            complexity_cp=250,
            clock_drift_ms=5000,
            telemetry={"tab_blur": 1, "copy_paste": 1},
        )
        self.assertLess(score, 70.0)

    def test_record_live_integrity_persists(self):
        record_live_move_integrity(
            self.game,
            self.white,
            think_ms=1200,
            telemetry={"tab_blur": 0},
            complexity_cp=80,
        )
        from apps.games.models import GameFairPlayTelemetry

        row = GameFairPlayTelemetry.objects.get(game=self.game, user=self.white)
        self.assertTrue(row.data.get("live_integrity_scores"))

    def test_fusion_detects_divergence(self):
        report = FairPlayReport.objects.create(
            game=self.game,
            user=self.white,
            verdict=FairPlayReport.Verdict.SUSPICIOUS,
            engine_top1_rate=0.8,
            avg_centipawn_loss=12.0,
        )
        moves = [
            {"played_by_white": True, "cp_loss": 90, "class": "mistake"},
            {"played_by_white": True, "cp_loss": 80, "class": "mistake"},
        ]
        fusion = fuse_analysis_fairplay(report, moves)
        self.assertGreater(fusion["fusion_score"], 0)
        self.assertIn("analysis_engine_divergence", fusion["signals"])

    def test_update_integrity_shadow_pool(self):
        report = FairPlayReport.objects.create(
            game=self.game,
            user=self.white,
            verdict=FairPlayReport.Verdict.LIKELY_CHEAT,
            engine_top1_rate=0.9,
        )
        profile = update_integrity_after_game(self.game, self.white, report)
        self.assertIsNotNone(profile)
        assert profile is not None
        self.assertTrue(profile.shadow_pool)
        self.assertTrue(user_in_shadow_pool(self.white))
        self.assertLess(profile.trust_score, 85.0)

    def test_profile_created_on_demand(self):
        profile = get_or_create_profile(self.black)
        self.assertEqual(profile.trust_score, 85.0)
        self.assertEqual(
            FairPlayIntegrityProfile.objects.filter(user=self.black).count(),
            1,
        )
