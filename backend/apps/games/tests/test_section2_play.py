"""Tests approfondis Section 2 — Play (tours IA, clocks, rematch, nulle, timeout)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.clock_service import apply_clock_tick_and_check, apply_server_clock_before_move
from apps.games.draw_rules import board_from_game_moves, can_claim_threefold_from_game
from apps.games.game_actions import (
    accept_draw,
    create_rematch,
    offer_draw,
    resign_game,
)
from apps.games.models import Game, Move
from apps.games.services import GameService
from apps.games.tasks import flag_expired_clocks

User = get_user_model()


class AiTurnGuardTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="ai_turn", password="x")
        self.svc = GameService()

    def test_human_cannot_move_on_ai_turn(self):
        game = self.svc.create_ai_game(self.user, color="white", is_timed=False)
        # Forcer le trait noir (IA) sans coup auto
        game.fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        game.move_count = 1
        game.save(update_fields=["fen", "move_count"])
        r2 = self.svc.make_move(game, self.user, "e7e5")
        self.assertEqual(r2.get("error"), "Not your turn")


class DrawAcceptGuardTests(TestCase):
    def setUp(self):
        self.w = User.objects.create_user(username="dw", password="x")
        self.b = User.objects.create_user(username="db", password="x")
        self.game = Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            status=Game.Status.ACTIVE,
            started_at=timezone.now(),
        )

    def test_accept_draw_requires_active(self):
        offer_draw(self.game, self.w)
        self.game.status = Game.Status.COMPLETED
        self.game.result = Game.Result.WHITE_WIN
        self.game.save()
        result = accept_draw(self.game, self.b)
        self.assertIn("error", result)
        self.game.refresh_from_db()
        self.assertEqual(self.game.result, Game.Result.WHITE_WIN)

    def test_move_clears_draw_offer(self):
        offer_draw(self.game, self.w)
        self.game.refresh_from_db()
        self.assertEqual(self.game.draw_offered_by_id, self.w.id)
        GameService().make_move(self.game, self.w, "e2e4")
        self.game.refresh_from_db()
        self.assertIsNone(self.game.draw_offered_by_id)


class RematchOfferAcceptTests(TestCase):
    def setUp(self):
        self.w = User.objects.create_user(username="rw", password="x")
        self.b = User.objects.create_user(username="rb", password="x")
        self.game = Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
            ended_at=timezone.now(),
            is_timed=True,
            time_control_minutes=5,
            white_time_ms=300000,
            black_time_ms=300000,
        )

    def test_first_click_offers_second_creates(self):
        first = create_rematch(self.game, self.w)
        self.assertIsNone(first)
        self.game.refresh_from_db()
        self.assertEqual(self.game.rematch_offered_by_id, self.w.id)

        second = create_rematch(self.game, self.b)
        self.assertIsNotNone(second)
        assert second is not None
        self.assertEqual(second.rematch_of_id, self.game.id)
        self.assertEqual(second.white_player_id, self.b.id)  # couleurs inversées
        self.assertEqual(second.black_player_id, self.w.id)

        # Pas de double rematch
        third = create_rematch(self.game, self.w)
        self.assertEqual(third.id, second.id)
        self.assertEqual(Game.objects.filter(rematch_of=self.game).count(), 1)


class RematchApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.w = User.objects.create_user(username="ra_w", password="x")
        self.b = User.objects.create_user(username="ra_b", password="x")
        self.game = Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            status=Game.Status.COMPLETED,
            result=Game.Result.DRAW,
            ended_at=timezone.now(),
        )

    def test_rematch_offer_returns_202(self):
        self.client.force_authenticate(self.w)
        res = self.client.post(f"/api/games/{self.game.id}/rematch/")
        self.assertEqual(res.status_code, 202)
        self.assertEqual(res.data["status"], "offered")

    def test_rematch_accept_returns_201(self):
        self.client.force_authenticate(self.w)
        self.client.post(f"/api/games/{self.game.id}/rematch/")
        self.client.force_authenticate(self.b)
        res = self.client.post(f"/api/games/{self.game.id}/rematch/")
        self.assertEqual(res.status_code, 201)
        self.assertIn("id", res.data)


class TimeoutInsufficientMaterialTests(TestCase):
    def test_king_vs_king_timeout_is_draw(self):
        w = User.objects.create_user(username="to_w", password="x")
        b = User.objects.create_user(username="to_b", password="x")
        game = Game.objects.create(
            white_player=w,
            black_player=b,
            status=Game.Status.ACTIVE,
            fen="8/8/8/4k3/8/8/8/4K3 w - - 0 1",
            is_timed=True,
            white_time_ms=0,
            black_time_ms=60000,
            turn_started_at=timezone.now() - timedelta(seconds=5),
        )
        svc = GameService()
        svc._finalize_game_on_timeout(game, winner_white=False)
        self.assertEqual(game.result, Game.Result.DRAW)
        self.assertEqual(game.termination_reason, "timeout_insufficient_material")


class FlagExpiredClocksTaskTests(TestCase):
    def test_flag_task_completes_timed_out_game(self):
        w = User.objects.create_user(username="fl_w", password="x")
        b = User.objects.create_user(username="fl_b", password="x")
        game = Game.objects.create(
            white_player=w,
            black_player=b,
            status=Game.Status.ACTIVE,
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            is_timed=True,
            white_time_ms=100,
            black_time_ms=60000,
            turn_started_at=timezone.now() - timedelta(seconds=5),
            started_at=timezone.now() - timedelta(minutes=1),
        )
        n = flag_expired_clocks()
        self.assertGreaterEqual(n, 1)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.termination_reason, "timeout")


class AiResignTests(TestCase):
    def test_resign_vs_ai_allowed(self):
        user = User.objects.create_user(username="ai_res", password="x")
        game = GameService().create_ai_game(user, color="white", is_timed=False)
        result = resign_game(game, user)
        self.assertTrue(result.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.BLACK_WIN)


class ThreefoldVariantAwareTests(TestCase):
    def test_board_from_game_moves_uses_start_fen(self):
        w = User.objects.create_user(username="tf_w", password="x")
        b = User.objects.create_user(username="tf_b", password="x")
        game = Game.objects.create(
            white_player=w,
            black_player=b,
            status=Game.Status.ACTIVE,
            fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
        )
        Move.objects.create(
            game=game, move_number=1, uci="e2e4", san="e4", played_by_white=True,
            fen_after=game.fen,
        )
        board = board_from_game_moves(game)
        self.assertIn(" e3 ", board.fen())


class SelectForUpdateMoveTests(TestCase):
    def test_illegal_second_move_rejected(self):
        w = User.objects.create_user(username="sf_w", password="x")
        b = User.objects.create_user(username="sf_b", password="x")
        game = Game.objects.create(
            white_player=w,
            black_player=b,
            status=Game.Status.ACTIVE,
            fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            started_at=timezone.now(),
        )
        svc = GameService()
        r1 = svc.make_move(game, w, "e2e4")
        self.assertNotIn("error", r1)
        # Même joueur rejoue — plus son tour
        r2 = svc.make_move(game, w, "d2d4")
        self.assertEqual(r2.get("error"), "Not your turn")
