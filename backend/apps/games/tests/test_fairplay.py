from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.fairplay_service import build_game_input, merge_telemetry, persist_fairplay_report
from apps.games.models import FairPlayReport, Game, Move
from apps.games.tests.fairplay_helpers import cpp_available, grant_fairplay_consent, run_fairplay_cpp

User = get_user_model()


class FairPlayServiceTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="white_fp", password="x")
        self.black = User.objects.create_user(username="black_fp", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.ACTIVE,
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
            think_ms=1200,
        )
        grant_fairplay_consent(self.white)

    def test_build_game_input_payload(self):
        payload = build_game_input(self.game, self.white)
        self.assertEqual(payload["game_id"], str(self.game.id))
        self.assertTrue(payload["player_is_white"])
        self.assertEqual(len(payload["moves"]), 1)

    def test_merge_telemetry_aliases(self):
        row = merge_telemetry(self.game, self.white, {"tab_blur": 2, "copy_paste": 1})
        self.assertEqual(row.data["tab_blur_count"], 2)
        self.assertEqual(row.data["copy_paste_events"], 1)

    def test_persist_fairplay_report(self):
        result = {
            "overall_score": 42.0,
            "verdict": "review",
            "signals": [{"code": "MOVE_BURST", "score": 40, "weight": 1, "detail": "test"}],
            "move_evals": [],
            "engine_top1_rate": 0.2,
            "engine_top3_rate": 0.4,
            "avg_centipawn_loss": 35.0,
            "accuracy_estimate": 88.0,
        }
        report = persist_fairplay_report(self.game, self.white, result)
        self.assertEqual(report.verdict, "review")
        self.assertEqual(FairPlayReport.objects.filter(game=self.game).count(), 1)


class FairPlayBinaryTests(TestCase):
    def test_cpp_binary_smoke(self):
        if not cpp_available():
            self.skipTest("fairplay binary not built")
        payload = {
            "game_id": "test",
            "player_elo": 1200,
            "player_is_white": True,
            "mode": "blitz",
            "analysis_mode": "realtime",
            "telemetry": {"tab_blur_count": 1},
            "moves": [
                {
                    "uci": "e2e4",
                    "san": "e4",
                    "played_by_white": True,
                    "move_number": 1,
                    "think_ms": 900,
                    "complexity_cp": 20,
                }
            ],
        }
        data = run_fairplay_cpp(payload)
        self.assertIn("verdict", data)
        self.assertIn("signals", data)
