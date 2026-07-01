"""Tests exemption Fair Play (comptes de confiance)."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.anticheat import validate_move_fairplay, validate_move_telemetry
from apps.games.fairplay_exempt import user_is_fairplay_exempt
from apps.games.fairplay_review import user_fairplay_restrictions, user_has_active_matchmaking_block
from apps.games.fairplay_service import analyze_and_store, merge_telemetry
from apps.games.models import FairPlaySanction, Game
from apps.games.services import MatchmakingService

User = get_user_model()


@override_settings(FAIRPLAY_EXEMPT_USERNAMES=["Maxime_KELI"])
class FairPlayExemptTests(TestCase):
    def setUp(self):
        self.exempt = User.objects.create_user(
            username="Maxime_KELI",
            password="test-only",
            fairplay_exempt=True,
        )
        self.regular = User.objects.create_user(username="regular_fp", password="x")
        self.opponent = User.objects.create_user(username="opp_fp", password="x")
        self.game = Game.objects.create(
            white_player=self.exempt,
            black_player=self.opponent,
            status=Game.Status.ACTIVE,
            is_vs_ai=False,
            is_rated=True,
            started_at=timezone.now(),
        )

    def test_username_and_flag_exempt(self):
        self.assertTrue(user_is_fairplay_exempt(self.exempt))
        by_settings = User.objects.create_user(username="Maxime_KELI", password="x")
        self.assertTrue(user_is_fairplay_exempt(by_settings))
        self.assertFalse(user_is_fairplay_exempt(self.regular))

    def test_anticheat_skipped_for_exempt(self):
        self.assertIsNone(
            validate_move_fairplay(
                self.game,
                self.exempt,
                think_ms=0,
                telemetry={"tab_blur": 99, "copy_paste": 99},
            )
        )
        self.assertIsNone(validate_move_telemetry(self.game, self.exempt, {"tab_blur": 99}))

    def test_telemetry_not_stored_for_exempt(self):
        row = merge_telemetry(self.game, self.exempt, {"tab_blur": 5, "copy_paste": 3})
        self.assertEqual((row.data or {}).get("tab_blur_count", 0), 0)

    def test_post_game_analysis_skipped(self):
        self.game.status = Game.Status.COMPLETED
        self.game.result = Game.Result.WHITE_WIN
        self.game.save()
        self.assertIsNone(analyze_and_store(self.game, self.exempt))

    def test_sanctions_ignored_for_exempt(self):
        FairPlaySanction.objects.create(
            user=self.exempt,
            sanction_type=FairPlaySanction.SanctionType.MATCHMAKING_BLOCK,
            is_active=True,
        )
        self.assertFalse(user_has_active_matchmaking_block(self.exempt))
        restrictions = user_fairplay_restrictions(self.exempt)
        self.assertFalse(restrictions["matchmaking_blocked"])
        self.assertFalse(restrictions["suspended"])

    def test_rated_matchmaking_without_consent(self):
        svc = MatchmakingService()
        svc.join_queue(self.exempt, "blitz", 1200, is_rated=True)
        svc.find_match(self.opponent, "blitz", 1200, is_rated=True)

    def test_fairplay_status_api(self):
        client = APIClient()
        client.force_authenticate(self.exempt)
        res = client.get("/api/games/fairplay/status/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["exempt"])
        self.assertTrue(res.data["consent_given"])
