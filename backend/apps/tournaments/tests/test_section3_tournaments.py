"""Tests approfondis Section 3 — Tournois / Ligues (idempotence, bye, scoring, arène)."""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.models import Game
from apps.games.stats_service import on_game_completed
from apps.ratings.league_service import get_or_create_standing, get_or_create_active_season
from apps.social.models import Club
from apps.tournaments.models import Tournament, TournamentParticipant
from apps.tournaments.services import TournamentEngine
from apps.tournaments.tasks import auto_start_due_tournaments, complete_expired_arenas

User = get_user_model()


def _finish(game: Game, result: str) -> Game:
    game.status = Game.Status.COMPLETED
    game.result = result
    game.ended_at = timezone.now()
    game.save(update_fields=["status", "result", "ended_at"])
    return game


class TournamentIdempotencyTests(TestCase):
    def setUp(self):
        self.org = User.objects.create_user(username="org_idem", password="x")
        self.p1 = User.objects.create_user(username="idem1", password="x")
        self.p2 = User.objects.create_user(username="idem2", password="x")
        self.engine = TournamentEngine()
        self.t = Tournament.objects.create(
            name="Arena Idem",
            slug="arena-idem",
            format=Tournament.Format.ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=timezone.now(),
            created_by=self.org,
        )
        self.engine.ensure_participant(self.t, self.p1)
        self.engine.ensure_participant(self.t, self.p2)
        self.engine.start_tournament(self.t)

    def test_record_result_idempotent(self):
        game = Game.objects.filter(tournament=self.t).first()
        self.assertIsNotNone(game)
        _finish(game, Game.Result.WHITE_WIN)
        self.engine.record_result(game)
        tp1 = TournamentParticipant.objects.get(tournament=self.t, user=game.white_player)
        score_once = tp1.score
        wins_once = tp1.wins
        self.engine.record_result(game)
        tp1.refresh_from_db()
        self.assertEqual(tp1.score, score_once)
        self.assertEqual(tp1.wins, wins_once)
        game.refresh_from_db()
        self.assertTrue(game.tournament_recorded)


class ArenaScoringAndEndTests(TestCase):
    def setUp(self):
        self.org = User.objects.create_user(username="org_arena", password="x")
        self.players = [
            User.objects.create_user(username=f"ar{i}", password="x") for i in range(2)
        ]
        self.engine = TournamentEngine()
        self.t = Tournament.objects.create(
            name="Arena Score",
            slug="arena-score",
            format=Tournament.Format.ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=timezone.now(),
            created_by=self.org,
            ends_at=timezone.now() + timedelta(hours=1),
        )
        for p in self.players:
            self.engine.ensure_participant(self.t, p)
        self.engine.start_tournament(self.t)

    def test_arena_win_is_two_points(self):
        game = Game.objects.filter(tournament=self.t).first()
        _finish(game, Game.Result.WHITE_WIN)
        self.engine.record_result(game)
        winner = TournamentParticipant.objects.get(
            tournament=self.t, user=game.white_player
        )
        loser = TournamentParticipant.objects.get(
            tournament=self.t, user=game.black_player
        )
        self.assertEqual(winner.score, 2.0)
        self.assertEqual(loser.score, 0.0)

    def test_arena_draw_is_one_point_each(self):
        game = Game.objects.filter(tournament=self.t).first()
        _finish(game, Game.Result.DRAW)
        self.engine.record_result(game)
        for user in (game.white_player, game.black_player):
            tp = TournamentParticipant.objects.get(tournament=self.t, user=user)
            self.assertEqual(tp.score, 1.0)
            self.assertEqual(tp.draws, 1)

    def test_maybe_complete_arena_when_ends_at_passed(self):
        self.t.ends_at = timezone.now() - timedelta(seconds=1)
        self.t.save(update_fields=["ends_at"])
        self.assertTrue(self.engine.maybe_complete_arena(self.t))
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, Tournament.Status.COMPLETED)

    def test_complete_expired_arenas_task(self):
        self.t.ends_at = timezone.now() - timedelta(minutes=1)
        self.t.save(update_fields=["ends_at"])
        n = complete_expired_arenas()
        self.assertGreaterEqual(n, 1)
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, Tournament.Status.COMPLETED)


class SwissByeAndScoringTests(TestCase):
    def setUp(self):
        self.org = User.objects.create_user(username="org_swiss", password="x")
        self.players = [
            User.objects.create_user(username=f"sw{i}", password="x") for i in range(3)
        ]
        self.engine = TournamentEngine()
        self.t = Tournament.objects.create(
            name="Swiss Bye",
            slug="swiss-bye",
            format=Tournament.Format.SWISS,
            status=Tournament.Status.REGISTRATION,
            mode="rapid",
            starts_at=timezone.now(),
            created_by=self.org,
            total_rounds=3,
        )
        for p in self.players:
            self.engine.ensure_participant(self.t, p)

    def test_swiss_odd_players_get_bye(self):
        self.engine.start_tournament(self.t)
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, Tournament.Status.ACTIVE)
        games = Game.objects.filter(tournament=self.t)
        self.assertEqual(games.count(), 1)
        bye_holders = TournamentParticipant.objects.filter(
            tournament=self.t, score=1.0, games_played=1
        )
        self.assertEqual(bye_holders.count(), 1)
        paired_ids = set()
        for g in games:
            paired_ids.add(g.white_player_id)
            paired_ids.add(g.black_player_id)
        bye_user = bye_holders.first().user_id
        self.assertNotIn(bye_user, paired_ids)

    def test_swiss_win_is_one_point(self):
        self.engine.start_tournament(self.t)
        game = Game.objects.filter(tournament=self.t).first()
        _finish(game, Game.Result.WHITE_WIN)
        self.engine.record_result(game)
        winner = TournamentParticipant.objects.get(
            tournament=self.t, user=game.white_player
        )
        self.assertEqual(winner.score, 1.0)
        self.assertEqual(winner.wins, 1)


class StartGuardAndAutoStartTests(TestCase):
    def setUp(self):
        self.org = User.objects.create_user(username="org_start", password="x")
        self.p1 = User.objects.create_user(username="st1", password="x")
        self.p2 = User.objects.create_user(username="st2", password="x")
        self.engine = TournamentEngine()
        self.t = Tournament.objects.create(
            name="Start Guard",
            slug="start-guard",
            format=Tournament.Format.ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=timezone.now() - timedelta(minutes=5),
            created_by=self.org,
        )
        self.engine.ensure_participant(self.t, self.p1)
        self.engine.ensure_participant(self.t, self.p2)

    def test_cannot_start_twice(self):
        self.engine.start_tournament(self.t)
        with self.assertRaises(ValueError):
            self.engine.start_tournament(self.t)

    def test_auto_start_due_tournaments(self):
        n = auto_start_due_tournaments()
        self.assertGreaterEqual(n, 1)
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, Tournament.Status.ACTIVE)
        self.assertIsNotNone(self.t.ends_at)


class ClubArenaPairingTests(TestCase):
    def setUp(self):
        self.org = User.objects.create_user(username="org_club", password="x")
        self.a1 = User.objects.create_user(username="ca1", password="x")
        self.a2 = User.objects.create_user(username="ca2", password="x")
        self.b1 = User.objects.create_user(username="cb1", password="x")
        self.b2 = User.objects.create_user(username="cb2", password="x")
        self.club_a = Club.objects.create(name="Club A", slug="club-a", owner=self.org)
        self.club_b = Club.objects.create(name="Club B", slug="club-b", owner=self.org)
        self.engine = TournamentEngine()
        self.t = Tournament.objects.create(
            name="Club Arena",
            slug="club-arena-pair",
            format=Tournament.Format.CLUB_ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=timezone.now(),
            created_by=self.org,
        )
        for u, club in (
            (self.a1, self.club_a),
            (self.a2, self.club_a),
            (self.b1, self.club_b),
            (self.b2, self.club_b),
        ):
            self.engine.ensure_participant(self.t, u)
            TournamentParticipant.objects.filter(tournament=self.t, user=u).update(
                club=club
            )

    def test_same_club_not_paired_on_start(self):
        self.engine.start_tournament(self.t)
        for game in Game.objects.filter(tournament=self.t):
            tp_w = TournamentParticipant.objects.get(
                tournament=self.t, user=game.white_player
            )
            tp_b = TournamentParticipant.objects.get(
                tournament=self.t, user=game.black_player
            )
            self.assertNotEqual(tp_w.club_id, tp_b.club_id)


class KnockoutDrawRematchTests(TestCase):
    def setUp(self):
        self.org = User.objects.create_user(username="org_ko", password="x")
        self.p1 = User.objects.create_user(username="ko1", password="x")
        self.p2 = User.objects.create_user(username="ko2", password="x")
        self.engine = TournamentEngine()
        self.t = Tournament.objects.create(
            name="KO Draw",
            slug="ko-draw",
            format=Tournament.Format.KNOCKOUT,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=timezone.now(),
            created_by=self.org,
        )
        self.engine.ensure_participant(self.t, self.p1)
        self.engine.ensure_participant(self.t, self.p2)
        self.engine.start_tournament(self.t)

    def test_draw_creates_rematch_and_keeps_tournament_active(self):
        game = Game.objects.filter(tournament=self.t).first()
        _finish(game, Game.Result.DRAW)
        self.engine.record_result(game)
        self.t.refresh_from_db()
        self.assertEqual(self.t.status, Tournament.Status.ACTIVE)
        active = Game.objects.filter(
            tournament=self.t, status=Game.Status.ACTIVE
        ).count()
        self.assertGreaterEqual(active, 1)


class WithdrawAndRatedGameTests(TestCase):
    def setUp(self):
        self.org = User.objects.create_user(username="org_wd", password="x")
        self.p1 = User.objects.create_user(username="wd1", password="x")
        self.p2 = User.objects.create_user(username="wd2", password="x")
        self.engine = TournamentEngine()
        self.t = Tournament.objects.create(
            name="Withdraw T",
            slug="withdraw-t",
            format=Tournament.Format.ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=timezone.now(),
            created_by=self.org,
            is_rated=False,
        )
        self.engine.ensure_participant(self.t, self.p1)
        self.engine.ensure_participant(self.t, self.p2)

    def test_withdraw_before_start(self):
        result = self.engine.withdraw(self.t, self.p1)
        self.assertEqual(result.get("status"), "unregistered")
        self.assertFalse(
            TournamentParticipant.objects.filter(tournament=self.t, user=self.p1).exists()
        )

    def test_unrated_tournament_creates_unrated_games(self):
        self.engine.start_tournament(self.t)
        game = Game.objects.filter(tournament=self.t).first()
        self.assertFalse(game.is_rated)


class LeagueIdempotencyTests(TestCase):
    def setUp(self):
        self.w = User.objects.create_user(username="lgw", password="x")
        self.b = User.objects.create_user(username="lgb", password="x")
        get_or_create_active_season()

    @patch("apps.games.stats_service.record_game_stats")
    def test_unrated_game_does_not_score_league(self, _mock_stats):
        game = Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
            is_rated=False,
            is_vs_ai=False,
            started_at=timezone.now(),
            ended_at=timezone.now(),
        )
        on_game_completed(game)
        standing = get_or_create_standing(self.w)
        self.assertEqual(standing.points, 0)
        game.refresh_from_db()
        self.assertFalse(game.league_recorded)

    @patch("apps.games.stats_service.record_game_stats")
    def test_rated_league_idempotent(self, _mock_stats):
        game = Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            status=Game.Status.COMPLETED,
            result=Game.Result.WHITE_WIN,
            is_rated=True,
            is_vs_ai=False,
            started_at=timezone.now(),
            ended_at=timezone.now(),
        )
        on_game_completed(game)
        standing = get_or_create_standing(self.w)
        points_once = standing.points
        self.assertGreater(points_once, 0)
        game.refresh_from_db()
        self.assertTrue(game.league_recorded)
        on_game_completed(game)
        standing.refresh_from_db()
        self.assertEqual(standing.points, points_once)


class TournamentApiTests(TestCase):
    def setUp(self):
        self.org = User.objects.create_user(username="api_org", password="x")
        self.user = User.objects.create_user(username="api_u", password="x")
        self.other = User.objects.create_user(username="api_o", password="x")
        self.client = APIClient()
        self.t = Tournament.objects.create(
            name="API T",
            slug="api-t",
            format=Tournament.Format.ARENA,
            status=Tournament.Status.REGISTRATION,
            mode="blitz",
            starts_at=timezone.now(),
            created_by=self.org,
        )
        TournamentEngine().ensure_participant(self.t, self.other)

    def test_withdraw_endpoint(self):
        self.client.force_authenticate(self.user)
        TournamentEngine().ensure_participant(self.t, self.user)
        r = self.client.post("/api/tournaments/api-t/withdraw/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data.get("status"), "unregistered")

    def test_register_team_battle_requires_valid_club(self):
        club_a = Club.objects.create(name="TA", slug="ta", owner=self.org)
        club_b = Club.objects.create(name="TB", slug="tb", owner=self.org)
        self.t.format = Tournament.Format.TEAM_BATTLE
        self.t.club_a = club_a
        self.t.club_b = club_b
        self.t.save()
        self.client.force_authenticate(self.user)
        bad = self.client.post(
            "/api/tournaments/api-t/register/", {"club_id": 99999}, format="json"
        )
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post(
            "/api/tournaments/api-t/register/",
            {"club_id": club_a.id},
            format="json",
        )
        self.assertEqual(ok.status_code, 200)
        tp = TournamentParticipant.objects.get(tournament=self.t, user=self.user)
        self.assertEqual(tp.club_id, club_a.id)
