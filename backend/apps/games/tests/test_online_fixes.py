"""Régression : nulle claim, flag, pas de triple-répétition auto."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.games.draw_rules import (
    bump_repetition_count,
    can_claim_threefold_from_game,
    init_repetition_counts,
)
from apps.games.game_actions import claim_draw, claim_flag
from apps.games.models import Game
from apps.games.services import GameService

User = get_user_model()


class ThreefoldClaimRequiredTests(TestCase):
    def test_threefold_does_not_auto_end(self):
        w = User.objects.create_user(username="tf_claim_w", password="x")
        b = User.objects.create_user(username="tf_claim_b", password="x")
        start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        game = Game.objects.create(
            white_player=w,
            black_player=b,
            status=Game.Status.ACTIVE,
            fen=start,
            is_timed=False,
            is_rated=False,
            repetition_counts=init_repetition_counts(start, "standard"),
            started_at=timezone.now(),
        )
        svc = GameService()
        # Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8 Nf3 → 3x position after Nf3 third time
        sequence = [
            (w, "g1f3"),
            (b, "g8f6"),
            (w, "f3g1"),
            (b, "f6g8"),
            (w, "g1f3"),
            (b, "g8f6"),
            (w, "f3g1"),
            (b, "f6g8"),
            (w, "g1f3"),
        ]
        last = None
        for player, uci in sequence:
            last = svc.make_move(game, player, uci)
            self.assertNotIn("error", last, last)
            game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.ACTIVE)
        self.assertTrue(last.get("threefold_available"))
        self.assertTrue(can_claim_threefold_from_game(game))
        claimed = claim_draw(game, b)
        self.assertTrue(claimed.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.DRAW)
        self.assertEqual(game.termination_reason, "repetition")


class ClaimFlagTests(TestCase):
    def test_claim_flag_awards_opponent(self):
        w = User.objects.create_user(username="flag_w", password="x")
        b = User.objects.create_user(username="flag_b", password="x")
        game = Game.objects.create(
            white_player=w,
            black_player=b,
            status=Game.Status.ACTIVE,
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            is_timed=True,
            white_time_ms=50,
            black_time_ms=60000,
            turn_started_at=timezone.now() - timedelta(seconds=2),
            started_at=timezone.now() - timedelta(minutes=1),
        )
        result = claim_flag(game, b)
        self.assertTrue(result.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.BLACK_WIN)
        self.assertEqual(game.termination_reason, "timeout")


class TimeoutOnMoveBroadcastsWin(TestCase):
    def test_make_move_timeout_returns_game_over_not_error(self):
        w = User.objects.create_user(username="to_mv_w", password="x")
        b = User.objects.create_user(username="to_mv_b", password="x")
        game = Game.objects.create(
            white_player=w,
            black_player=b,
            status=Game.Status.ACTIVE,
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            is_timed=True,
            white_time_ms=0,
            black_time_ms=60000,
            turn_started_at=timezone.now() - timedelta(seconds=1),
            started_at=timezone.now() - timedelta(minutes=1),
        )
        result = GameService().make_move(game, w, "e2e4")
        self.assertNotIn("error", result)
        self.assertTrue(result.get("game_over"))
        self.assertEqual(result.get("reason"), "timeout")
        game.refresh_from_db()
        self.assertEqual(game.result, Game.Result.BLACK_WIN)
        self.assertEqual(game.termination_reason, "timeout")
