"""Tests limites tier analyse (sync, async, redaction, PGN)."""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.games.models import Game, GameAnalysis, Move
from apps.users.models import User as UserModel
from apps.users.premium_utils import (
    DIAMOND_ANALYSIS_DEPTH,
    DIAMOND_AUTO_ANALYSIS_DEPTH,
    FREE_ANALYSIS_DEPTH,
    FREE_AUTO_ANALYSIS_DEPTH,
    GOLD_ANALYSIS_DEPTH,
    GOLD_AUTO_ANALYSIS_DEPTH,
    analysis_engine_depth,
    auto_analysis_engine_depth,
    max_analysis_moves,
    redact_game_analysis_payload,
)

User = get_user_model()


class AnalysisTierUtilsTests(TestCase):
    def setUp(self):
        self.free = User.objects.create_user(username="tier_free", password="x")
        self.gold = User.objects.create_user(username="tier_gold", password="x")
        self.gold.subscription_tier = UserModel.SubscriptionTier.GOLD
        self.gold.save()
        self.diamond = User.objects.create_user(username="tier_dia", password="x")
        self.diamond.subscription_tier = UserModel.SubscriptionTier.DIAMOND
        self.diamond.save()

    def test_max_analysis_moves_unlimited(self):
        self.assertIsNone(max_analysis_moves(self.free))
        self.assertIsNone(max_analysis_moves(self.gold))
        self.assertIsNone(max_analysis_moves(self.diamond))

    def test_analysis_depth_by_tier(self):
        self.assertEqual(analysis_engine_depth(self.free), FREE_ANALYSIS_DEPTH)
        self.assertEqual(analysis_engine_depth(self.gold), GOLD_ANALYSIS_DEPTH)
        self.assertEqual(analysis_engine_depth(self.diamond), DIAMOND_ANALYSIS_DEPTH)

    def test_auto_analysis_depth_by_tier(self):
        self.assertEqual(auto_analysis_engine_depth(self.free), FREE_AUTO_ANALYSIS_DEPTH)
        self.assertEqual(auto_analysis_engine_depth(self.gold), GOLD_AUTO_ANALYSIS_DEPTH)
        self.assertEqual(auto_analysis_engine_depth(self.diamond), DIAMOND_AUTO_ANALYSIS_DEPTH)

    def test_redact_analysis_keeps_full_game(self):
        moves = [{"uci": f"e2e{i%8}", "san": "x"} for i in range(100)]
        data = {"best_moves_json": moves, "summary_fr": "ok"}
        out = redact_game_analysis_payload(data, self.free)
        self.assertEqual(len(out["best_moves_json"]), 100)
        self.assertFalse(out.get("analysis_truncated"))


class AnalysisRedactionApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.analyzer = User.objects.create_user(username="analyzer", password="x")
        self.analyzer.subscription_tier = UserModel.SubscriptionTier.DIAMOND
        self.analyzer.save()
        self.viewer = User.objects.create_user(username="viewer_free", password="x")
        self.game = Game.objects.create(
            white_player=self.analyzer,
            black_player=self.viewer,
            status=Game.Status.COMPLETED,
            mode=Game.Mode.BLITZ,
            move_count=50,
        )
        for i in range(50):
            Move.objects.create(
                game=self.game,
                move_number=i + 1,
                san="e4" if i % 2 == 0 else "e5",
                uci="e2e4" if i % 2 == 0 else "e7e5",
                from_square="e2" if i % 2 == 0 else "e7",
                to_square="e4" if i % 2 == 0 else "e5",
                fen_after="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
                played_by_white=i % 2 == 0,
            )
        moves_json = [{"uci": "e2e4", "san": "e4", "class": "good"} for _ in range(50)]
        GameAnalysis.objects.create(
            game=self.game,
            accuracy_white=90,
            accuracy_black=88,
            best_moves_json=moves_json,
            summary_fr="test",
        )

    def test_game_detail_flags_truncated_analysis(self):
        self.client.force_authenticate(user=self.viewer)
        resp = self.client.get(f"/api/games/{self.game.id}/")
        self.assertEqual(resp.status_code, 200)
        analysis = resp.data.get("analysis")
        self.assertIsNotNone(analysis)
        self.assertEqual(len(analysis["best_moves_json"]), 50)
        self.assertFalse(analysis.get("analysis_incomplete"))

    def test_game_detail_flags_incomplete_analysis(self):
        moves_json = [{"uci": "e2e4", "san": "e4", "class": "good"} for _ in range(40)]
        self.game.analysis.best_moves_json = moves_json
        self.game.analysis.save(update_fields=["best_moves_json"])
        self.client.force_authenticate(user=self.viewer)
        resp = self.client.get(f"/api/games/{self.game.id}/")
        analysis = resp.data.get("analysis")
        self.assertTrue(analysis.get("analysis_incomplete"))


class AnalyzePgnTierTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="pgn_free", password="x")

    @patch("apps.learning.views.analyze_pgn")
    def test_pgn_analysis_uses_full_game(self, mock_analyze):
        mock_analyze.return_value = {"moves": [], "summary_fr": "x"}
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/learning/analyze/",
            {"pgn": '[Event "t"]\n1. e4 e5 2. Nf3 Nc6 *'},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        mock_analyze.assert_called_once()
        _args, kwargs = mock_analyze.call_args
        self.assertIsNone(kwargs.get("max_moves"))
