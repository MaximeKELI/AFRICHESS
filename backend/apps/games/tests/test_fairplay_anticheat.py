"""Tests anti-triche temps réel (Python) — timing et télémétrie."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.games.anticheat import (
    validate_move_fairplay,
    validate_move_telemetry,
    validate_move_timing,
)
from apps.games.models import Game, Move
from apps.games.tests.fairplay_helpers import grant_fairplay_consent

User = get_user_model()


class AnticheatTimingTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="w_ac", password="x")
        self.black = User.objects.create_user(username="b_ac", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.ACTIVE,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )

    def test_vs_ai_skips_checks(self):
        self.game.is_vs_ai = True
        self.game.save()
        self.assertIsNone(validate_move_timing(self.game, self.white))

    def test_normal_move_allowed(self):
        self.assertIsNone(validate_move_timing(self.game, self.white, think_ms=1500))

    def test_too_fast_same_side_blocked(self):
        Move.objects.create(
            game=self.game,
            move_number=1,
            san="e4",
            uci="e2e4",
            fen_after=self.game.fen,
            played_by_white=True,
        )
        Move.objects.filter(game=self.game).update(
            created_at=timezone.now() - timedelta(milliseconds=20)
        )
        err = validate_move_timing(self.game, self.white)
        self.assertIsNotNone(err)
        self.assertEqual(err["code"], "anticheat")

    def test_opponent_move_then_fast_reply_allowed(self):
        Move.objects.create(
            game=self.game,
            move_number=1,
            san="e4",
            uci="e2e4",
            fen_after=self.game.fen,
            played_by_white=True,
        )
        Move.objects.create(
            game=self.game,
            move_number=2,
            san="e5",
            uci="e7e5",
            fen_after=self.game.fen,
            played_by_white=False,
        )
        err = validate_move_timing(self.game, self.white, think_ms=100)
        self.assertIsNone(err)

    def test_burst_moves_blocked(self):
        now = timezone.now()
        for i in range(51):
            m = Move.objects.create(
                game=self.game,
                move_number=i + 1,
                san="e4",
                uci="e2e4",
                fen_after=self.game.fen,
                played_by_white=True,
            )
            Move.objects.filter(pk=m.pk).update(created_at=now - timedelta(seconds=i % 50))
        err = validate_move_timing(self.game, self.white)
        self.assertIsNotNone(err)
        self.assertIn("Trop de coups", err["error"])


class AnticheatTelemetryTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="w_tel", password="x")
        self.black = User.objects.create_user(username="b_tel", password="x")
        self.game = Game.objects.create(
            white_player=self.white,
            black_player=self.black,
            status=Game.Status.ACTIVE,
            mode=Game.Mode.BLITZ,
            is_rated=True,
        )
        grant_fairplay_consent(self.white)

    def test_tab_blur_per_move_limit(self):
        err = validate_move_telemetry(self.game, self.white, {"tab_blur": 5})
        self.assertIsNotNone(err)
        self.assertEqual(err["code"], "anticheat")

    def test_cumulative_copy_paste_limit(self):
        for _ in range(8):
            validate_move_telemetry(self.game, self.white, {"copy_paste": 1})
        err = validate_move_telemetry(self.game, self.white, {"copy_paste": 1})
        self.assertIsNotNone(err)
        self.assertIn("Copier-coller", err["error"])

    def test_fairplay_no_midgame_cpp_block(self):
        """Pas de subprocess C++ bloquant en cours de partie."""
        import apps.games.anticheat as anticheat_mod

        self.assertFalse(hasattr(anticheat_mod, "run_fairplay_analysis"))
        err = validate_move_fairplay(
            self.game,
            self.white,
            think_ms=500,
            telemetry={"tab_blur": 1},
        )
        self.assertIsNone(err)
