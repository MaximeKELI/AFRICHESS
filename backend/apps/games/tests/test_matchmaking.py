from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.models import FairPlayUserConsent, Game, MatchmakingQueue
from apps.games.services import MatchmakingService

User = get_user_model()


def grant_fairplay_consent(user):
    FairPlayUserConsent.objects.update_or_create(
        user=user,
        defaults={
            "consent_version": FairPlayUserConsent.CONSENT_VERSION,
            "consented_at": timezone.now(),
        },
    )


class MatchmakingJoinQueueTests(TestCase):
    """join_queue doit toujours persister time_control (jamais NULL en base)."""

    def setUp(self):
        self.svc = MatchmakingService()
        self.user = User.objects.create_user(username="mm_join", password="x")

    def _entry(self):
        return MatchmakingQueue.objects.get(user=self.user)

    def test_unrated_blitz_without_time_control_uses_default(self):
        self.svc.join_queue(
            self.user, "blitz", 1500, is_rated=False, is_timed=True
        )
        entry = self._entry()
        self.assertEqual(entry.time_control, "3+2")
        self.assertIsNotNone(entry.time_control)

    def test_unrated_blitz_with_preset(self):
        self.svc.join_queue(
            self.user,
            "blitz",
            1500,
            is_rated=False,
            is_timed=True,
            time_control="5+0",
        )
        self.assertEqual(self._entry().time_control, "5+0")

    def test_rated_blitz_without_time_control_uses_mode_default(self):
        grant_fairplay_consent(self.user)
        self.svc.join_queue(
            self.user, "blitz", 1500, is_rated=True, is_timed=True
        )
        self.assertEqual(self._entry().time_control, "3+2")

    def test_untimed_persists_empty_string_not_null(self):
        self.svc.join_queue(
            self.user, "blitz", 1500, is_rated=False, is_timed=False
        )
        entry = self._entry()
        self.assertEqual(entry.time_control, "")
        self.assertFalse(entry.is_timed)

    def test_rejoin_updates_time_control(self):
        self.svc.join_queue(
            self.user,
            "blitz",
            1500,
            is_rated=False,
            is_timed=True,
            time_control="3+0",
        )
        self.svc.join_queue(
            self.user,
            "blitz",
            1500,
            is_rated=False,
            is_timed=True,
            time_control="5+0",
        )
        self.assertEqual(self._entry().time_control, "5+0")


class MatchmakingPairingTests(TestCase):
    def setUp(self):
        self.svc = MatchmakingService()
        self.a = User.objects.create_user(username="mm_a", password="x")
        self.b = User.objects.create_user(username="mm_b", password="x")
        self.c = User.objects.create_user(username="mm_c", password="x")

    def test_pair_same_time_control(self):
        self.svc.join_queue(
            self.a, "blitz", 1200, is_rated=False, time_control="3+2"
        )
        self.svc.join_queue(
            self.b, "blitz", 1250, is_rated=False, time_control="3+2"
        )
        self.svc.pair_all_waiting()
        self.assertEqual(MatchmakingQueue.objects.count(), 0)
        self.assertEqual(Game.objects.filter(is_vs_ai=False).count(), 1)

    def test_no_pair_different_time_control(self):
        self.svc.join_queue(
            self.a, "blitz", 1200, is_rated=False, time_control="3+2"
        )
        self.svc.join_queue(
            self.b, "blitz", 1250, is_rated=False, time_control="5+0"
        )
        self.svc.pair_all_waiting()
        self.assertEqual(MatchmakingQueue.objects.count(), 2)
        self.assertEqual(Game.objects.filter(is_vs_ai=False).count(), 0)

    def test_find_match_respects_time_control(self):
        self.svc.join_queue(
            self.a, "blitz", 1200, is_rated=False, time_control="3+2"
        )
        game = self.svc.find_match(
            self.b,
            "blitz",
            1250,
            is_rated=False,
            is_timed=True,
            time_control="3+2",
        )
        self.assertIsNotNone(game)
        self.assertEqual(MatchmakingQueue.objects.count(), 0)

        self.svc.join_queue(
            self.a, "blitz", 1200, is_rated=False, time_control="3+2"
        )
        no_game = self.svc.find_match(
            self.c,
            "blitz",
            1250,
            is_rated=False,
            is_timed=True,
            time_control="5+0",
        )
        self.assertIsNone(no_game)
        self.assertEqual(MatchmakingQueue.objects.count(), 1)


class MatchmakingApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="mm_api", password="x")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_post_join_queue_without_time_control_returns_200(self):
        res = self.client.post(
            "/api/games/matchmaking/",
            {"mode": "blitz", "is_rated": False, "is_timed": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "searching")

        entry = MatchmakingQueue.objects.get(user=self.user)
        self.assertEqual(entry.time_control, "3+2")
        self.assertIsNotNone(entry.time_control)

    def test_post_with_explicit_time_control(self):
        res = self.client.post(
            "/api/games/matchmaking/",
            {
                "mode": "blitz",
                "is_rated": False,
                "is_timed": True,
                "time_control": "5+0",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            MatchmakingQueue.objects.get(user=self.user).time_control, "5+0"
        )

    def test_post_immediate_match_returns_201(self):
        opponent = User.objects.create_user(username="mm_opp", password="x")
        MatchmakingService().join_queue(
            opponent,
            "blitz",
            1200,
            is_rated=False,
            is_timed=True,
            time_control="3+2",
        )
        res = self.client.post(
            "/api/games/matchmaking/",
            {
                "mode": "blitz",
                "is_rated": False,
                "is_timed": True,
                "time_control": "3+2",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("id", res.data)
        self.assertEqual(MatchmakingQueue.objects.count(), 0)
