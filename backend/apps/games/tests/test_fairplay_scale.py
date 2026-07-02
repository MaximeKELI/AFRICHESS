"""Tests fair play scale — shadow pools batch & stats."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.fairplay_scale import batch_sync_shadow_pools, collect_fairplay_scale_stats
from apps.games.models import FairPlayIntegrityProfile

User = get_user_model()


class FairPlayScaleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="scale_fp", password="x")
        self.profile = FairPlayIntegrityProfile.objects.create(
            user=self.user,
            trust_score=40.0,
            shadow_pool=False,
        )

    def test_collect_stats(self):
        stats = collect_fairplay_scale_stats()
        self.assertIn("shadow_pool_users", stats)
        self.assertIn("matchmaking", stats)
        self.assertIn("auto_sanctions_shadow_mode", stats)

    def test_batch_promotes_low_trust(self):
        result = batch_sync_shadow_pools()
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.shadow_pool)
        self.assertGreaterEqual(result["promoted_to_shadow"], 1)

    def test_batch_releases_recovered_trust(self):
        self.profile.trust_score = 75.0
        self.profile.shadow_pool = True
        self.profile.last_fusion_score = 0.0
        self.profile.save()
        result = batch_sync_shadow_pools()
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.shadow_pool)
        self.assertGreaterEqual(result["released_from_shadow"], 1)
