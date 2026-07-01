"""
Tests unitaires — matchmaking live et parties en ligne entre humains.

Couvre :
- règles d'appariement (ELO, variante, cadence, classé)
- API matchmaking (rejoindre / quitter / garde-fous Fair Play)
- tâche Celery de pairing
- coups, permissions et fin de partie PvP via HTTP
- flux bout-en-bout matchmaking → partie → coups
"""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.fairplay_review import apply_review_decision, open_review_case
from apps.games.fairplay_service import persist_fairplay_report
from apps.games.models import FairPlayUserConsent, Game, GameRoom, MatchmakingQueue, Move
from apps.games.services import GameService, MatchmakingService, create_matchmaking_game
from apps.games.tasks import pair_matchmaking_queues
from apps.games.tests.test_matchmaking import grant_fairplay_consent

User = get_user_model()

MM_PAYLOAD = {
    "mode": "blitz",
    "is_rated": False,
    "is_timed": True,
    "time_control": "3+2",
}


def _block_matchmaking(user) -> None:
    """Applique une sanction matchmaking_block (comme en prod après review staff)."""
    game = Game.objects.create(
        white_player=user,
        black_player=User.objects.create_user(username=f"fp_opp_{user.id}", password="x"),
        status=Game.Status.COMPLETED,
        mode=Game.Mode.BLITZ,
        is_rated=True,
    )
    report = persist_fairplay_report(
        game,
        user,
        {
            "overall_score": 90.0,
            "verdict": "likely_cheat",
            "signals": [],
            "move_evals": [],
            "engine_top1_rate": 0.9,
            "engine_top3_rate": 0.9,
            "avg_centipawn_loss": 10.0,
            "accuracy_estimate": 95.0,
        },
    )
    case = open_review_case(report)
    staff = User.objects.create_user(username=f"staff_{user.id}", password="x", is_staff=True)
    apply_review_decision(
        case.id,
        staff,
        status="confirmed",
        decision="matchmaking_block",
        notes="test",
        suspend_days=3,
    )


def _create_human_game(white, black, **kwargs) -> Game:
    defaults = dict(
        mode="blitz",
        is_timed=True,
        time_control="3+2",
        is_rated=False,
    )
    defaults.update(kwargs)
    return GameService().create_friend_game(white, black, **defaults)


class MatchmakingPairingRulesTests(TestCase):
    """Règles métier d'appariement dans MatchmakingService."""

    def setUp(self):
        self.svc = MatchmakingService()
        self.a = User.objects.create_user(username="pvp_a", password="x")
        self.b = User.objects.create_user(username="pvp_b", password="x")

    def test_pair_within_elo_range(self):
        self.svc.join_queue(self.a, "blitz", 1200, is_rated=False, time_control="3+2")
        self.svc.join_queue(self.b, "blitz", 1380, is_rated=False, time_control="3+2")
        self.svc.pair_all_waiting()
        self.assertEqual(MatchmakingQueue.objects.count(), 0)
        self.assertEqual(Game.objects.filter(is_vs_ai=False).count(), 1)

    def test_no_pair_outside_elo_range(self):
        self.svc.join_queue(self.a, "blitz", 1000, is_rated=False, time_control="3+2")
        self.svc.join_queue(self.b, "blitz", 1210, is_rated=False, time_control="3+2")
        self.svc.pair_all_waiting()
        self.assertEqual(MatchmakingQueue.objects.count(), 2)
        self.assertEqual(Game.objects.filter(is_vs_ai=False).count(), 0)

    def test_no_pair_different_variant(self):
        self.svc.join_queue(
            self.a, "blitz", 1200, is_rated=False, time_control="3+2", variant="standard"
        )
        self.svc.join_queue(
            self.b, "blitz", 1250, is_rated=False, time_control="3+2", variant="chess960"
        )
        self.svc.pair_all_waiting()
        self.assertEqual(MatchmakingQueue.objects.count(), 2)

    def test_no_pair_rated_vs_unrated(self):
        grant_fairplay_consent(self.a)
        self.svc.join_queue(self.a, "blitz", 1200, is_rated=True, time_control="3+2")
        self.svc.join_queue(self.b, "blitz", 1250, is_rated=False, time_control="3+2")
        self.svc.pair_all_waiting()
        self.assertEqual(MatchmakingQueue.objects.count(), 2)

    def test_leave_queue_removes_entry(self):
        self.svc.join_queue(self.a, "blitz", 1200, is_rated=False, time_control="3+2")
        self.svc.leave_queue(self.a)
        self.assertFalse(MatchmakingQueue.objects.filter(user=self.a).exists())

    def test_cleanup_stale_removes_old_entries(self):
        self.svc.join_queue(self.a, "blitz", 1200, is_rated=False, time_control="3+2")
        MatchmakingQueue.objects.filter(user=self.a).update(
            joined_at=timezone.now() - timedelta(minutes=15)
        )
        self.svc.cleanup_stale(minutes=10)
        self.assertFalse(MatchmakingQueue.objects.filter(user=self.a).exists())

    def test_rated_join_without_consent_raises(self):
        with self.assertRaises(ValueError) as ctx:
            self.svc.join_queue(self.a, "blitz", 1200, is_rated=True)
        self.assertIn("Consentement", str(ctx.exception))

    def test_blocked_user_cannot_join(self):
        _block_matchmaking(self.a)
        with self.assertRaises(ValueError) as ctx:
            self.svc.join_queue(self.a, "blitz", 1200, is_rated=False)
        self.assertIn("bloqué", str(ctx.exception).lower())

    def test_created_game_has_room_and_both_players(self):
        game = create_matchmaking_game(
            white=self.a,
            black=self.b,
            mode="blitz",
            is_timed=True,
            time_control="3+2",
            is_rated=False,
        )
        self.assertEqual(game.status, Game.Status.ACTIVE)
        self.assertFalse(game.is_vs_ai)
        self.assertEqual(game.white_player_id, self.a.id)
        self.assertEqual(game.black_player_id, self.b.id)
        self.assertTrue(GameRoom.objects.filter(game=game).exists())


class MatchmakingApiTests(TestCase):
    """Endpoints HTTP /api/games/matchmaking/."""

    def setUp(self):
        self.user = User.objects.create_user(username="mm_api_pvp", password="x")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_delete_leaves_queue(self):
        res = self.client.post("/api/games/matchmaking/", MM_PAYLOAD, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(MatchmakingQueue.objects.filter(user=self.user).exists())

        leave = self.client.delete("/api/games/matchmaking/")
        self.assertEqual(leave.status_code, 200)
        self.assertEqual(leave.data["status"], "left_queue")
        self.assertFalse(MatchmakingQueue.objects.filter(user=self.user).exists())

    def test_rated_without_consent_returns_403(self):
        res = self.client.post(
            "/api/games/matchmaking/",
            {**MM_PAYLOAD, "is_rated": True},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data["code"], "fairplay_sanction")
        self.assertFalse(MatchmakingQueue.objects.filter(user=self.user).exists())

    def test_blocked_user_returns_403(self):
        _block_matchmaking(self.user)
        res = self.client.post("/api/games/matchmaking/", MM_PAYLOAD, format="json")
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data["code"], "fairplay_sanction")

    def test_second_player_triggers_immediate_match(self):
        opponent = User.objects.create_user(username="mm_wait", password="x")
        MatchmakingService().join_queue(
            opponent, "blitz", 1200, is_rated=False, time_control="3+2"
        )
        res = self.client.post("/api/games/matchmaking/", MM_PAYLOAD, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertIn("id", res.data)
        game = Game.objects.get(id=res.data["id"])
        self.assertEqual(
            {game.white_player_id, game.black_player_id},
            {self.user.id, opponent.id},
        )
        self.assertEqual(MatchmakingQueue.objects.count(), 0)


class MatchmakingCeleryTests(TestCase):
    """Pairing automatique via tâche Celery."""

    def setUp(self):
        self.a = User.objects.create_user(username="cel_a", password="x")
        self.b = User.objects.create_user(username="cel_b", password="x")

    def test_pair_matchmaking_queues_pairs_waiting_players(self):
        svc = MatchmakingService()
        svc.join_queue(self.a, "blitz", 1200, is_rated=False, time_control="3+2")
        svc.join_queue(self.b, "blitz", 1250, is_rated=False, time_control="3+2")
        self.assertEqual(MatchmakingQueue.objects.count(), 2)

        pair_matchmaking_queues()

        self.assertEqual(MatchmakingQueue.objects.count(), 0)
        game = Game.objects.filter(is_vs_ai=False).get()
        self.assertEqual(
            {game.white_player_id, game.black_player_id},
            {self.a.id, self.b.id},
        )


class HumanOnlineMoveTests(TestCase):
    """Coups et permissions sur parties humain vs humain."""

    def setUp(self):
        self.white = User.objects.create_user(username="hum_w", password="x")
        self.black = User.objects.create_user(username="hum_b", password="x")
        self.spectator = User.objects.create_user(username="hum_spec", password="x")
        self.game = _create_human_game(self.white, self.black)
        self.white_client = APIClient()
        self.white_client.force_authenticate(user=self.white)
        self.black_client = APIClient()
        self.black_client.force_authenticate(user=self.black)
        self.spec_client = APIClient()
        self.spec_client.force_authenticate(user=self.spectator)

    def test_white_plays_first_move(self):
        res = self.white_client.post(
            f"/api/games/{self.game.id}/move/",
            {"uci": "e2e4"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("fen", res.data)
        self.game.refresh_from_db()
        self.assertEqual(self.game.move_count, 1)
        self.assertTrue(
            Move.objects.filter(game=self.game, uci="e2e4", played_by_white=True).exists()
        )

    def test_black_responds_after_white(self):
        self.white_client.post(
            f"/api/games/{self.game.id}/move/", {"uci": "e2e4"}, format="json"
        )
        res = self.black_client.post(
            f"/api/games/{self.game.id}/move/",
            {"uci": "e7e5"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.move_count, 2)

    def test_wrong_turn_rejected(self):
        res = self.black_client.post(
            f"/api/games/{self.game.id}/move/",
            {"uci": "e7e5"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.data)

    def test_non_participant_cannot_move(self):
        res = self.spec_client.post(
            f"/api/games/{self.game.id}/move/",
            {"uci": "e2e4"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_illegal_move_rejected(self):
        res = self.white_client.post(
            f"/api/games/{self.game.id}/move/",
            {"uci": "e2e5"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Illegal", res.data["error"])

    def test_resign_completes_game(self):
        res = self.white_client.post(
            f"/api/games/{self.game.id}/resign/", {}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.game.refresh_from_db()
        self.assertEqual(self.game.status, Game.Status.COMPLETED)
        self.assertEqual(self.game.result, Game.Result.BLACK_WIN)
        self.assertEqual(self.game.termination_reason, "resignation")

    def test_spectator_can_view_active_game(self):
        res = self.spec_client.get(f"/api/games/{self.game.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(str(res.data["id"]), str(self.game.id))


class HumanOnlineFlowTests(TestCase):
    """Flux complet : file d'attente → partie → séquence de coups."""

    def setUp(self):
        self.white = User.objects.create_user(username="flow_w", password="x")
        self.black = User.objects.create_user(username="flow_b", password="x")
        self.white_client = APIClient()
        self.white_client.force_authenticate(user=self.white)
        self.black_client = APIClient()
        self.black_client.force_authenticate(user=self.black)

    def test_matchmaking_to_opening_moves(self):
        waiting = self.white_client.post(
            "/api/games/matchmaking/", MM_PAYLOAD, format="json"
        )
        self.assertEqual(waiting.status_code, 200)
        self.assertEqual(waiting.data["status"], "searching")

        matched = self.black_client.post(
            "/api/games/matchmaking/", MM_PAYLOAD, format="json"
        )
        self.assertEqual(matched.status_code, 201)
        game_id = matched.data["id"]

        game = Game.objects.get(id=game_id)
        self.assertEqual(game.status, Game.Status.ACTIVE)
        self.assertFalse(game.is_vs_ai)

        if game.white_player_id == self.white.id:
            white_client, black_client = self.white_client, self.black_client
        else:
            white_client, black_client = self.black_client, self.white_client

        white_move = white_client.post(
            f"/api/games/{game_id}/move/", {"uci": "e2e4"}, format="json"
        )
        self.assertEqual(white_move.status_code, 200, white_move.data)

        black_move = black_client.post(
            f"/api/games/{game_id}/move/", {"uci": "e7e5"}, format="json"
        )
        self.assertEqual(black_move.status_code, 200, black_move.data)

        game.refresh_from_db()
        self.assertEqual(game.move_count, 2)
        self.assertIn("4P3", game.fen)

    def test_draw_offer_and_accept(self):
        game = _create_human_game(self.white, self.black)
        self.white_client.post(f"/api/games/{game.id}/move/", {"uci": "e2e4"}, format="json")
        self.black_client.post(f"/api/games/{game.id}/move/", {"uci": "e7e5"}, format="json")

        offer = self.white_client.post(f"/api/games/{game.id}/draw/", {}, format="json")
        self.assertEqual(offer.status_code, 200)

        accept = self.black_client.post(
            f"/api/games/{game.id}/draw/respond/",
            {"accept": True},
            format="json",
        )
        self.assertEqual(accept.status_code, 200)
        game.refresh_from_db()
        self.assertEqual(game.status, Game.Status.COMPLETED)
        self.assertEqual(game.result, Game.Result.DRAW)
