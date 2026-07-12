"""Parité Lichess — une suite unitaire par domaine (nulle / flag / matchmaking)."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.games.draw_rules import (
    _position_key,
    can_claim_fifty_moves_from_game,
    can_claim_threefold_from_game,
    init_repetition_counts,
    is_fivefold_repetition_from_game,
    is_seventyfive_moves_from_game,
)
from apps.games.game_actions import accept_draw, claim_draw, claim_flag, offer_draw
from apps.games.models import Game, MatchmakingQueue
from apps.games.services import GameService, MatchmakingService
from apps.games.tasks import flag_expired_clocks
from apps.games.views import MatchmakingStatusView

User = get_user_model()


def _pvp(**kwargs) -> Game:
    w = kwargs.pop("white", None) or User.objects.create_user(
        username=f"w_{Game.objects.count()}", password="x"
    )
    b = kwargs.pop("black", None) or User.objects.create_user(
        username=f"b_{Game.objects.count()}", password="x"
    )
    defaults = dict(
        white_player=w,
        black_player=b,
        status=Game.Status.ACTIVE,
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        is_timed=False,
        is_rated=False,
        started_at=timezone.now(),
        repetition_counts=init_repetition_counts(
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "standard"
        ),
    )
    defaults.update(kwargs)
    return Game.objects.create(**defaults)


# ---------------------------------------------------------------------------
# 1. Nulles (Lichess / FIDE)
# ---------------------------------------------------------------------------


class LichessThreefoldTests(TestCase):
    """Triple répétition : claim requis (pas auto), les deux camps peuvent claim."""

    def _reach_threefold(self):
        game = _pvp()
        w, b = game.white_player, game.black_player
        svc = GameService()
        seq = [
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
        for player, uci in seq:
            last = svc.make_move(game, player, uci)
            self.assertNotIn("error", last, last)
            game.refresh_from_db()
        return game, w, b, last

    def test_threefold_does_not_auto_end(self):
        game, _w, _b, last = self._reach_threefold()
        self.assertEqual(game.status, Game.Status.ACTIVE)
        self.assertTrue(last.get("threefold_available"))
        self.assertTrue(can_claim_threefold_from_game(game))

    def test_opponent_can_claim_threefold(self):
        game, _w, b, _last = self._reach_threefold()
        claimed = claim_draw(game, b)
        self.assertTrue(claimed.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.result, Game.Result.DRAW)
        self.assertEqual(game.termination_reason, "repetition")

    def test_mover_can_claim_threefold(self):
        game, w, _b, _last = self._reach_threefold()
        claimed = claim_draw(game, w)
        self.assertTrue(claimed.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.termination_reason, "repetition")

    def test_offer_then_repeating_move_claims_like_lichess(self):
        """Lichess : proposer nulle puis jouer le coup qui crée la 3e = claim."""
        game = _pvp()
        w, b = game.white_player, game.black_player
        svc = GameService()
        for player, uci in [
            (w, "g1f3"),
            (b, "g8f6"),
            (w, "f3g1"),
            (b, "f6g8"),
            (w, "g1f3"),
            (b, "g8f6"),
            (w, "f3g1"),
            (b, "f6g8"),
        ]:
            self.assertNotIn("error", svc.make_move(game, player, uci))
            game.refresh_from_db()
        offer_draw(game, w)
        game.refresh_from_db()
        last = svc.make_move(game, w, "g1f3")
        self.assertNotIn("error", last)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.termination_reason, "repetition")
        self.assertEqual(last.get("draw_claim"), "threefold")


class LichessFivefoldTests(TestCase):
    """Quintuple répétition : nulle automatique."""

    def test_fivefold_auto_draw(self):
        start = "8/8/8/4k3/8/8/8/4K3 w - - 0 1"
        after = "8/8/8/4k3/8/8/4K3/8 b - - 1 1"
        key = _position_key(after, "standard")
        game = _pvp(
            fen=start,
            repetition_counts={
                **init_repetition_counts(start, "standard"),
                key: 4,
            },
        )
        result = GameService().make_move(game, game.white_player, "e1e2")
        self.assertNotIn("error", result)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.DRAW)
        self.assertEqual(result.get("draw_claim"), "fivefold")
        self.assertEqual(game.termination_reason, "repetition")


class LichessFiftyMoveTests(TestCase):
    """50 coups : claim requis + signal fifty_available (matériel suffisant)."""

    FEN_99 = "4k3/8/8/8/8/8/8/R3K3 w Q - 99 50"

    def test_fifty_signals_but_does_not_auto_end(self):
        fen = self.FEN_99
        game = _pvp(fen=fen, repetition_counts=init_repetition_counts(fen, "standard"))
        result = GameService().make_move(game, game.white_player, "a1a2")
        self.assertNotIn("error", result)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.ACTIVE)
        self.assertTrue(result.get("fifty_available"))
        self.assertTrue(can_claim_fifty_moves_from_game(game))

    def test_fifty_can_be_claimed(self):
        fen = self.FEN_99
        game = _pvp(fen=fen, repetition_counts=init_repetition_counts(fen, "standard"))
        GameService().make_move(game, game.white_player, "a1a2")
        game.refresh_from_db()
        claimed = claim_draw(game, game.black_player)
        self.assertTrue(claimed.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.termination_reason, "fifty_move")
        self.assertEqual(game.result, Game.Result.DRAW)


class LichessSeventyfiveMoveTests(TestCase):
    """75 coups : nulle automatique — 150 demi-coups (matériel suffisant)."""

    def test_seventyfive_auto_draw(self):
        fen = "4k3/8/8/8/8/8/8/R3K3 w Q - 149 80"
        game = _pvp(fen=fen, repetition_counts=init_repetition_counts(fen, "standard"))
        result = GameService().make_move(game, game.white_player, "a1a2")
        self.assertNotIn("error", result)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.DRAW)
        self.assertEqual(game.termination_reason, "seventyfive_move")
        self.assertEqual(result.get("draw_claim"), "seventyfive")
        self.assertTrue(is_seventyfive_moves_from_game(game))


class LichessDrawOfferTests(TestCase):
    """Offre de nulle : acceptation adverse ; annulée au coup suivant."""

    def test_accept_draw_agreement(self):
        game = _pvp()
        offer_draw(game, game.white_player)
        result = accept_draw(game, game.black_player)
        self.assertTrue(result.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.termination_reason, "draw_agreement")
        self.assertEqual(game.result, Game.Result.DRAW)

    def test_move_clears_draw_offer(self):
        game = _pvp()
        offer_draw(game, game.white_player)
        game.refresh_from_db()
        self.assertEqual(game.draw_offered_by_id, game.white_player_id)
        GameService().make_move(game, game.white_player, "e2e4")
        game.refresh_from_db()
        self.assertIsNone(game.draw_offered_by_id)
        self.assertEqual(game.status, Game.Status.ACTIVE)


class LichessStalemateTests(TestCase):
    """Pat / matériel insuffisant : nulle automatique."""

    def test_stalemate_auto_draw(self):
        fen = "7k/8/5K2/6Q1/8/8/8/8 w - - 0 1"
        game = _pvp(fen=fen, repetition_counts=init_repetition_counts(fen, "standard"))
        result = GameService().make_move(game, game.white_player, "g5g6")
        self.assertNotIn("error", result)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.DRAW)
        self.assertEqual(game.termination_reason, "stalemate")

    def test_insufficient_material_auto_draw(self):
        fen = "8/8/8/4k3/8/8/8/4K3 w - - 0 1"
        game = _pvp(fen=fen, repetition_counts=init_repetition_counts(fen, "standard"))
        result = GameService().make_move(game, game.white_player, "e1e2")
        self.assertNotIn("error", result)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.DRAW)


# ---------------------------------------------------------------------------
# 2. Flag / timeout (Lichess)
# ---------------------------------------------------------------------------


class LichessFlagTests(TestCase):
    def test_flag_awards_opponent(self):
        game = _pvp(
            is_timed=True,
            white_time_ms=50,
            black_time_ms=60000,
            turn_started_at=timezone.now() - timedelta(seconds=2),
        )
        result = claim_flag(game, game.black_player)
        self.assertTrue(result.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.result, Game.Result.BLACK_WIN)
        self.assertEqual(game.termination_reason, "timeout")

    def test_flag_insufficient_material_is_draw(self):
        game = _pvp(
            fen="8/8/8/4k3/8/8/8/4K3 w - - 0 1",
            is_timed=True,
            white_time_ms=0,
            black_time_ms=60000,
            turn_started_at=timezone.now() - timedelta(seconds=1),
            repetition_counts=init_repetition_counts(
                "8/8/8/4k3/8/8/8/4K3 w - - 0 1", "standard"
            ),
        )
        svc = GameService()
        svc._finalize_game_on_timeout(game, winner_white=False)
        self.assertEqual(game.result, Game.Result.DRAW)
        self.assertEqual(game.termination_reason, "timeout_insufficient_material")

    def test_make_move_on_expired_clock_ends_game(self):
        game = _pvp(
            is_timed=True,
            white_time_ms=0,
            black_time_ms=60000,
            turn_started_at=timezone.now() - timedelta(seconds=1),
        )
        result = GameService().make_move(game, game.white_player, "e2e4")
        self.assertNotIn("error", result)
        self.assertTrue(result.get("game_over"))
        self.assertEqual(result.get("reason"), "timeout")
        game.refresh_from_db()
        self.assertEqual(game.result, Game.Result.BLACK_WIN)

    def test_celery_flag_task(self):
        game = _pvp(
            is_timed=True,
            white_time_ms=100,
            black_time_ms=60000,
            turn_started_at=timezone.now() - timedelta(seconds=5),
        )
        n = flag_expired_clocks()
        self.assertGreaterEqual(n, 1)
        game.refresh_from_db()
        self.assertEqual(game.termination_reason, "timeout")


# ---------------------------------------------------------------------------
# 3. Matchmaking (deux chercheurs actifs)
# ---------------------------------------------------------------------------


@override_settings(MATCHMAKING_REDIS_ENABLED=False)
class LichessMatchmakingTests(TestCase):
    def setUp(self):
        self.svc = MatchmakingService()
        self.a = User.objects.create_user(username="mm_a", password="x")
        self.b = User.objects.create_user(username="mm_b", password="x")

    def test_single_searcher_does_not_create_game(self):
        game = self.svc.search(
            self.a, "blitz", 1200, is_rated=False, is_timed=True, time_control="3+2"
        )
        self.assertIsNone(game)
        self.assertEqual(MatchmakingQueue.objects.filter(user=self.a).count(), 1)
        self.assertEqual(Game.objects.filter(is_vs_ai=False).count(), 0)

    def test_two_searchers_create_game(self):
        self.svc.search(
            self.a, "blitz", 1200, is_rated=False, is_timed=True, time_control="3+2"
        )
        game = self.svc.search(
            self.b, "blitz", 1250, is_rated=False, is_timed=True, time_control="3+2"
        )
        self.assertIsNotNone(game)
        self.assertEqual(MatchmakingQueue.objects.count(), 0)

    def test_leave_queue_prevents_pairing(self):
        self.svc.search(
            self.a, "blitz", 1200, is_rated=False, is_timed=True, time_control="3+2"
        )
        self.svc.leave_queue(self.a)
        game = self.svc.search(
            self.b, "blitz", 1250, is_rated=False, is_timed=True, time_control="3+2"
        )
        self.assertIsNone(game)

    def test_status_endpoint_does_not_pair(self):
        self.svc.join_queue(self.a, "blitz", 1200, is_rated=False, time_control="3+2")
        self.svc.join_queue(self.b, "blitz", 1250, is_rated=False, time_control="3+2")
        with patch.object(MatchmakingService, "pair_all_waiting") as pair_mock:
            from django.contrib.auth.models import AnonymousUser
            from rest_framework.test import APIRequestFactory

            view = MatchmakingStatusView()
            req = APIRequestFactory().get("/api/games/matchmaking/status/")
            req.user = AnonymousUser()
            view.get(req)
            pair_mock.assert_not_called()


class RedisMatchmakingGhostTests(TestCase):
    """Lua refuse les fantômes sans hash mm:user."""

    def test_lua_skips_candidates_without_user_hash(self):
        from apps.games import matchmaking_redis as mmr

        self.assertIn("EXISTS", mmr.MATCH_OR_ENQUEUE_LUA)
        self.assertIn("mm:user:", mmr.MATCH_OR_ENQUEUE_LUA)
