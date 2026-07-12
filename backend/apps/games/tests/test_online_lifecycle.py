"""
Cycle de vie complet — demande en ligne → partie → toutes les fins possibles.

Couvre absolument chaque situation du parcours PvP humain :
  A. Matchmaking (joindre, attendre, quitter, pairer, classé/consent)
  B. Défi direct (créer, accepter, refuser, annuler)
  C. Démarrage (ACTIVE + GameRoom)
  D. Pendant la partie (coups, tours, offres, claims, abort, flag…)
  E. Après la partie (rematch, coup refusé)
  F. Pipeline HTTP bout-en-bout matchmaking → coups → abandon
"""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.challenge_service import (
    ChallengeError,
    accept_challenge,
    cancel_challenge,
    create_player_challenge,
    decline_challenge,
)
from apps.games.draw_rules import init_repetition_counts
from apps.games.game_actions import (
    abort_game,
    accept_draw,
    claim_draw,
    claim_flag,
    create_rematch,
    decline_draw,
    offer_draw,
    resign_game,
)
from apps.games.models import Game, GameRoom, MatchmakingQueue
from apps.games.room_utils import ensure_game_room
from apps.games.services import GameService, MatchmakingService
from apps.games.tests.fairplay_helpers import grant_fairplay_consent
from apps.games.tests.mm_test_utils import reset_matchmaking_state

User = get_user_model()

MM_KW = dict(
    mode="blitz",
    is_rated=False,
    is_timed=True,
    time_control="3+2",
)


@override_settings(MATCHMAKING_REDIS_ENABLED=False)
class OnlineLifecycleExhaustiveTests(TestCase):
    """Toutes les situations de la demande en ligne jusqu'à la fin de partie."""

    def setUp(self):
        reset_matchmaking_state()
        self.mm = MatchmakingService()
        self.gs = GameService()
        self.a = User.objects.create_user(username="life_a", password="x")
        self.b = User.objects.create_user(username="life_b", password="x")
        self.c = User.objects.create_user(username="life_c", password="x")
        self.ca = APIClient()
        self.cb = APIClient()
        self.ca.force_authenticate(self.a)
        self.cb.force_authenticate(self.b)

    def tearDown(self):
        reset_matchmaking_state()

    # ------------------------------------------------------------------ helpers
    def _pair(self) -> Game:
        self.mm.search(self.a, elo=1200, **MM_KW)
        game = self.mm.search(self.b, elo=1250, **MM_KW)
        self.assertIsNotNone(game)
        return game

    def _friend_game(self, **kwargs) -> Game:
        defaults = dict(
            mode="blitz",
            is_timed=False,
            is_rated=False,
            time_control="3+2",
        )
        defaults.update(kwargs)
        game = self.gs.create_friend_game(self.a, self.b, **defaults)
        ensure_game_room(game)
        return game

    def _reach_threefold(self, game: Game):
        w, b = game.white_player, game.black_player
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
            last = self.gs.make_move(game, player, uci)
            self.assertNotIn("error", last, last)
            game.refresh_from_db()
        return last

    # ================================================================== A. MM
    def test_01_single_searcher_waits_no_game(self):
        game = self.mm.search(self.a, elo=1200, **MM_KW)
        self.assertIsNone(game)
        self.assertEqual(MatchmakingQueue.objects.filter(user=self.a).count(), 1)
        self.assertEqual(Game.objects.filter(is_vs_ai=False).count(), 0)

    def test_02_leave_queue_before_opponent(self):
        self.mm.search(self.a, elo=1200, **MM_KW)
        self.mm.leave_queue(self.a)
        self.assertEqual(MatchmakingQueue.objects.filter(user=self.a).count(), 0)
        game = self.mm.search(self.b, elo=1250, **MM_KW)
        self.assertIsNone(game)

    def test_03_two_searchers_create_active_game_with_room(self):
        game = self._pair()
        self.assertEqual(game.status, Game.Status.ACTIVE)
        self.assertIsNotNone(game.started_at)
        ensure_game_room(game)
        self.assertTrue(GameRoom.objects.filter(game=game).exists())
        self.assertEqual(MatchmakingQueue.objects.count(), 0)
        ids = {game.white_player_id, game.black_player_id}
        self.assertEqual(ids, {self.a.id, self.b.id})

    def test_04_different_time_control_does_not_pair(self):
        self.mm.search(self.a, elo=1200, mode="blitz", is_rated=False, is_timed=True, time_control="3+2")
        game = self.mm.search(
            self.b, elo=1250, mode="blitz", is_rated=False, is_timed=True, time_control="5+0"
        )
        self.assertIsNone(game)
        self.assertEqual(MatchmakingQueue.objects.count(), 2)

    def test_04b_requester_chosen_rapid_pairs(self):
        """Le demandeur choisit 10+0 (rapid) — pas forcé en blitz."""
        self.mm.search(
            self.a, elo=1200, mode="rapid", is_rated=False, is_timed=True, time_control="10+0"
        )
        game = self.mm.search(
            self.b, elo=1250, mode="rapid", is_rated=False, is_timed=True, time_control="10+0"
        )
        self.assertIsNotNone(game)
        self.assertEqual(game.mode, "rapid")
        self.assertIn("10", (game.time_control_minutes and str(game.time_control_minutes)) or "10")

    def test_05_rated_requires_fairplay_consent(self):
        with self.assertRaises(ValueError):
            self.mm.search(
                self.a,
                elo=1200,
                mode="blitz",
                is_rated=True,
                is_timed=True,
                time_control="3+2",
            )
        grant_fairplay_consent(self.a)
        grant_fairplay_consent(self.b)
        self.mm.search(
            self.a, elo=1200, mode="blitz", is_rated=True, is_timed=True, time_control="3+2"
        )
        game = self.mm.search(
            self.b, elo=1250, mode="blitz", is_rated=True, is_timed=True, time_control="3+2"
        )
        self.assertIsNotNone(game)
        self.assertTrue(game.is_rated)

    def test_06_http_matchmaking_search_leave_and_pair(self):
        r = self.ca.post("/api/games/matchmaking/", MM_KW, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data.get("status"), "searching")
        r = self.ca.delete("/api/games/matchmaking/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(MatchmakingQueue.objects.filter(user=self.a).count(), 0)

        self.ca.post("/api/games/matchmaking/", MM_KW, format="json")
        r2 = self.cb.post("/api/games/matchmaking/", MM_KW, format="json")
        self.assertEqual(r2.status_code, 201)
        self.assertIn("id", r2.data)

    # ================================================================== B. Défi
    def test_07_challenge_decline(self):
        ch = create_player_challenge(self.a, self.b, is_rated=False, time_control="3+2")
        decline_challenge(ch, self.b)
        ch.refresh_from_db()
        self.assertEqual(ch.status, ch.Status.DECLINED)
        self.assertIsNone(ch.game_id)

    def test_08_challenge_cancel(self):
        ch = create_player_challenge(self.a, self.b, is_rated=False, time_control="3+2")
        cancel_challenge(ch, self.a)
        ch.refresh_from_db()
        self.assertEqual(ch.status, ch.Status.CANCELLED)

    def test_09_challenge_accept_creates_game(self):
        ch = create_player_challenge(self.a, self.b, is_rated=False, time_control="3+2")
        ch = accept_challenge(ch, self.b)
        self.assertEqual(ch.status, ch.Status.ACCEPTED)
        self.assertIsNotNone(ch.game_id)
        game = ch.game
        self.assertEqual(game.status, Game.Status.ACTIVE)
        ensure_game_room(game)
        self.assertTrue(GameRoom.objects.filter(game=game).exists())

    def test_10_challenge_cannot_accept_own(self):
        ch = create_player_challenge(self.a, self.b, is_rated=False, time_control="3+2")
        with self.assertRaises(ChallengeError):
            accept_challenge(ch, self.a)

    # ================================================================== C+D coups
    def test_11_legal_illegal_wrong_turn_and_completed(self):
        game = self._friend_game()
        r = self.gs.make_move(game, self.b, "e7e5")
        self.assertIn("error", r)
        self.assertIn("turn", r["error"].lower())

        r = self.gs.make_move(game, self.a, "e2e5")
        self.assertIn("error", r)

        r = self.gs.make_move(game, self.a, "e2e4")
        self.assertNotIn("error", r)
        game.refresh_from_db()
        self.assertEqual(game.move_count, 1)

        resign_game(game, self.a)
        game.refresh_from_db()
        r = self.gs.make_move(game, self.b, "e7e5")
        self.assertIn("error", r)
        self.assertIn("not active", r["error"].lower())

    def test_12_draw_offer_decline_then_continue(self):
        game = self._friend_game()
        self.gs.make_move(game, self.a, "e2e4")
        offer_draw(game, self.a)
        game.refresh_from_db()
        self.assertEqual(game.draw_offered_by_id, self.a.id)
        decline_draw(game, self.b)
        game.refresh_from_db()
        self.assertIsNone(game.draw_offered_by_id)
        self.assertEqual(game.status, Game.Status.ACTIVE)
        r = self.gs.make_move(game, self.b, "e7e5")
        self.assertNotIn("error", r)

    def test_13_draw_offer_accept_ends_agreement(self):
        game = self._friend_game()
        offer_draw(game, self.a)
        accept_draw(game, self.b)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.DRAW)
        self.assertEqual(game.termination_reason, "draw_agreement")

    def test_14_move_clears_pending_draw_offer(self):
        game = self._friend_game()
        offer_draw(game, self.b)
        game.refresh_from_db()
        self.assertEqual(game.draw_offered_by_id, self.b.id)
        self.gs.make_move(game, self.a, "e2e4")
        game.refresh_from_db()
        self.assertIsNone(game.draw_offered_by_id)

    def test_15_threefold_available_then_claim(self):
        game = self._friend_game()
        last = self._reach_threefold(game)
        self.assertTrue(last.get("threefold_available"))
        self.assertEqual(game.status, Game.Status.ACTIVE)
        claim_draw(game, self.b)
        game.refresh_from_db()
        self.assertEqual(game.termination_reason, "repetition")
        self.assertEqual(game.result, Game.Result.DRAW)

    def test_16_offer_then_repeating_move_auto_claims(self):
        game = self._friend_game()
        w, b = game.white_player, game.black_player
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
            self.assertNotIn("error", self.gs.make_move(game, player, uci))
            game.refresh_from_db()
        offer_draw(game, w)
        last = self.gs.make_move(game, w, "g1f3")
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(last.get("draw_claim"), "threefold")

    def test_17_fifty_move_claim(self):
        fen = "4k3/8/8/8/8/8/8/R3K3 w Q - 99 50"
        game = self._friend_game()
        game.fen = fen
        game.repetition_counts = init_repetition_counts(fen, "standard")
        game.save()
        last = self.gs.make_move(game, self.a, "a1a2")
        self.assertTrue(last.get("fifty_available"))
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.ACTIVE)
        claim_draw(game, self.b)
        game.refresh_from_db()
        self.assertEqual(game.termination_reason, "fifty_move")

    def test_18_seventyfive_auto_draw(self):
        fen = "4k3/8/8/8/8/8/8/R3K3 w Q - 149 80"
        game = self._friend_game()
        game.fen = fen
        game.repetition_counts = init_repetition_counts(fen, "standard")
        game.save()
        last = self.gs.make_move(game, self.a, "a1a2")
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.termination_reason, "seventyfive_move")
        self.assertEqual(last.get("draw_claim"), "seventyfive")

    def test_19_stalemate_and_insufficient_material(self):
        fen = "7k/8/5K2/6Q1/8/8/8/8 w - - 0 1"
        game = self._friend_game()
        game.fen = fen
        game.repetition_counts = init_repetition_counts(fen, "standard")
        game.save()
        self.gs.make_move(game, self.a, "g5g6")
        game.refresh_from_db()
        self.assertEqual(game.termination_reason, "stalemate")

        fen2 = "8/8/8/4k3/8/8/8/4K3 w - - 0 1"
        g2 = self._friend_game()
        # create_friend_game always uses a+b — need unique players for second game
        g2 = self.gs.create_friend_game(
            self.a, self.c, mode="blitz", is_timed=False, is_rated=False
        )
        g2.fen = fen2
        g2.repetition_counts = init_repetition_counts(fen2, "standard")
        g2.save()
        self.gs.make_move(g2, self.a, "e1e2")
        g2.refresh_from_db()
        self.assertEqual(g2.status, Game.Status.COMPLETED)
        self.assertEqual(g2.result, Game.Result.DRAW)

    def test_20_resign_awards_opponent(self):
        game = self._friend_game()
        resign_game(game, self.a)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.BLACK_WIN)
        self.assertEqual(game.termination_reason, "resignation")

    def test_21_abort_early_allowed_then_blocked(self):
        game = self._friend_game()
        game.started_at = timezone.now()
        game.save(update_fields=["started_at"])
        r = abort_game(game, self.a)
        self.assertTrue(r.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.ABORTED)

        game2 = self._friend_game()
        game2.started_at = timezone.now()
        game2.save(update_fields=["started_at"])
        self.gs.make_move(game2, self.a, "e2e4")
        self.gs.make_move(game2, self.b, "e7e5")
        game2.refresh_from_db()
        r2 = abort_game(game2, self.a)
        self.assertIn("error", r2)

    def test_22_claim_flag_timeout_win(self):
        game = self._friend_game(is_timed=True, time_control="3+2")
        game.white_time_ms = 50
        game.black_time_ms = 60_000
        game.turn_started_at = timezone.now() - timedelta(seconds=3)
        game.save()
        r = claim_flag(game, self.b)
        self.assertTrue(r.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.result, Game.Result.BLACK_WIN)
        self.assertEqual(game.termination_reason, "timeout")

    def test_23_timeout_insufficient_material_draw(self):
        fen = "8/8/8/4k3/8/8/8/4K3 w - - 0 1"
        game = self._friend_game(is_timed=True, time_control="3+2")
        game.fen = fen
        game.repetition_counts = init_repetition_counts(fen, "standard")
        game.white_time_ms = 0
        game.black_time_ms = 60_000
        game.turn_started_at = timezone.now() - timedelta(seconds=1)
        game.save()
        r = claim_flag(game, self.b)
        self.assertTrue(r.get("ok"))
        game.refresh_from_db()
        self.assertEqual(game.result, Game.Result.DRAW)
        self.assertEqual(game.termination_reason, "timeout_insufficient_material")

    def test_24_make_move_on_expired_clock_ends(self):
        game = self._friend_game(is_timed=True, time_control="3+2")
        game.white_time_ms = 0
        game.black_time_ms = 60_000
        game.turn_started_at = timezone.now() - timedelta(seconds=1)
        game.save()
        r = self.gs.make_move(game, self.a, "e2e4")
        self.assertNotIn("error", r)
        self.assertTrue(r.get("game_over"))
        self.assertEqual(r.get("reason"), "timeout")
        game.refresh_from_db()
        self.assertEqual(game.result, Game.Result.BLACK_WIN)

    # ================================================================== E. après
    def test_25_rematch_offer_then_accept(self):
        game = self._friend_game()
        resign_game(game, self.a)
        game.refresh_from_db()
        first = create_rematch(game, self.a)
        self.assertIsNone(first)
        game.refresh_from_db()
        self.assertEqual(game.rematch_offered_by_id, self.a.id)
        rematch = create_rematch(game, self.b)
        self.assertIsNotNone(rematch)
        self.assertEqual(rematch.status, Game.Status.ACTIVE)
        self.assertEqual(rematch.rematch_of_id, game.id)
        # Couleurs inversées
        self.assertEqual(rematch.white_player_id, game.black_player_id)
        self.assertEqual(rematch.black_player_id, game.white_player_id)

    def test_26_abort_has_no_rematch(self):
        game = self._friend_game()
        game.started_at = timezone.now()
        game.save(update_fields=["started_at"])
        abort_game(game, self.a)
        game.refresh_from_db()
        self.assertIsNone(create_rematch(game, self.a))

    # ================================================================== F. E2E HTTP
    def test_27_http_matchmaking_to_moves_to_resign(self):
        """Pipeline complet API : chercher → partie → coups → abandon → rematch."""
        r1 = self.ca.post("/api/games/matchmaking/", MM_KW, format="json")
        self.assertEqual(r1.status_code, 200)
        r2 = self.cb.post("/api/games/matchmaking/", MM_KW, format="json")
        self.assertEqual(r2.status_code, 201)
        game_id = r2.data["id"]

        game = Game.objects.get(id=game_id)
        white_id = game.white_player_id
        client_w = self.ca if white_id == self.a.id else self.cb
        client_b = self.cb if white_id == self.a.id else self.ca

        m1 = client_w.post(f"/api/games/{game_id}/move/", {"uci": "e2e4"}, format="json")
        self.assertEqual(m1.status_code, 200, m1.data)
        m2 = client_b.post(f"/api/games/{game_id}/move/", {"uci": "e7e5"}, format="json")
        self.assertEqual(m2.status_code, 200, m2.data)

        # Offre nulle refusée
        d1 = client_w.post(f"/api/games/{game_id}/draw/", format="json")
        self.assertEqual(d1.status_code, 200)
        d2 = client_b.post(
            f"/api/games/{game_id}/draw/respond/", {"accept": False}, format="json"
        )
        self.assertEqual(d2.status_code, 200)

        bad = client_w.post(f"/api/games/{game_id}/move/", {"uci": "e7e6"}, format="json")
        self.assertEqual(bad.status_code, 400)

        res = client_w.post(f"/api/games/{game_id}/resign/", format="json")
        self.assertEqual(res.status_code, 200)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.termination_reason, "resignation")

        # Rematch HTTP
        r_off = client_w.post(f"/api/games/{game_id}/rematch/", format="json")
        self.assertIn(r_off.status_code, (200, 202))
        r_acc = client_b.post(f"/api/games/{game_id}/rematch/", format="json")
        self.assertEqual(r_acc.status_code, 201)
        self.assertIn("id", r_acc.data)
        self.assertNotEqual(str(r_acc.data["id"]), str(game_id))

        # Coup sur partie terminée
        dead = client_w.post(f"/api/games/{game_id}/move/", {"uci": "d2d4"}, format="json")
        self.assertEqual(dead.status_code, 400)

    def test_28_http_challenge_to_game_to_draw_accept(self):
        ch = self.ca.post(
            "/api/games/challenge/",
            {
                "username": self.b.username,
                "mode": "blitz",
                "is_rated": False,
                "is_timed": True,
                "time_control": "3+2",
            },
            format="json",
        )
        self.assertEqual(ch.status_code, 201, getattr(ch, "data", ch.content))
        challenge_id = ch.data["id"]
        acc = self.cb.post(f"/api/games/challenges/{challenge_id}/accept/", format="json")
        self.assertEqual(acc.status_code, 200, acc.data)
        game_id = acc.data["game"]["id"]

        game = Game.objects.get(id=game_id)
        white_client = self.ca if game.white_player_id == self.a.id else self.cb
        black_client = self.cb if game.white_player_id == self.a.id else self.ca

        white_client.post(f"/api/games/{game_id}/draw/", format="json")
        end = black_client.post(
            f"/api/games/{game_id}/draw/respond/", {"accept": True}, format="json"
        )
        self.assertEqual(end.status_code, 200)
        game.refresh_from_db()
        self.assertEqual(game.termination_reason, "draw_agreement")

    def test_29_all_ending_kinds_reachable_from_online_pair(self):
        """Depuis un matchmaking, chaque type de fin de partie est atteignable."""
        endings = []

        # 1) Abandon
        g = self._pair()
        resign_game(g, g.white_player)
        g.refresh_from_db()
        endings.append(g.termination_reason)
        reset_matchmaking_state()

        # 2) Accord de nulle
        g = self._pair()
        offer_draw(g, g.white_player)
        accept_draw(g, g.black_player)
        g.refresh_from_db()
        endings.append(g.termination_reason)
        reset_matchmaking_state()

        # 3) Abort
        g = self._pair()
        g.started_at = timezone.now()
        g.move_count = 0
        g.save()
        abort_game(g, g.white_player)
        g.refresh_from_db()
        endings.append(g.termination_reason)
        reset_matchmaking_state()

        # 4) Flag
        g = self._pair()
        g.is_timed = True
        g.white_time_ms = 0
        g.black_time_ms = 60_000
        g.turn_started_at = timezone.now() - timedelta(seconds=2)
        g.save()
        claim_flag(g, g.black_player)
        g.refresh_from_db()
        endings.append(g.termination_reason)
        reset_matchmaking_state()

        self.assertEqual(
            set(endings),
            {
                "resignation",
                "draw_agreement",
                "aborted_by_agreement",
                "timeout",
            },
        )
