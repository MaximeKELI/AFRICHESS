"""Tests parties par correspondance."""

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.correspondence import (
    CorrespondenceMatchmakingService,
    create_correspondence_game,
    my_correspondence_games,
)
from apps.games.models import CorrespondenceQueue, Game

User = get_user_model()


class CorrespondenceTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="corr_w", password="x")
        self.black = User.objects.create_user(username="corr_b", password="x")

    def test_create_correspondence_game(self):
        game = create_correspondence_game(self.white, self.black, days_per_move=3)
        self.assertEqual(game.mode, Game.Mode.CORRESPONDENCE)
        self.assertEqual(game.days_per_move, 3)
        self.assertIsNotNone(game.turn_deadline)

    def test_matchmaking_pairs_players(self):
        svc = CorrespondenceMatchmakingService()
        first = svc.join_queue(self.white, days_per_move=3)
        self.assertIsNone(first)
        self.assertTrue(CorrespondenceQueue.objects.filter(user=self.white).exists())

        second = svc.join_queue(self.black, days_per_move=3)
        self.assertIsNotNone(second)
        player_ids = {second.white_player_id, second.black_player_id}
        self.assertEqual(player_ids, {self.white.id, self.black.id})
        self.assertFalse(CorrespondenceQueue.objects.filter(user=self.white).exists())

    def test_my_correspondence_games_lists_active(self):
        game = create_correspondence_game(self.white, self.black, days_per_move=5)
        qs = my_correspondence_games(self.white)
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first().id, game.id)

    def test_celery_pair_task_matches_queue(self):
        from apps.games.tasks import pair_correspondence_queues
        from apps.ratings.models import PlayerRating

        u1 = User.objects.create_user(username="daily_a", password="x")
        u2 = User.objects.create_user(username="daily_b", password="x")
        PlayerRating.objects.create(user=u1, mode="rapid", elo=1200)
        PlayerRating.objects.create(user=u2, mode="rapid", elo=1250)
        CorrespondenceQueue.objects.create(user=u1, days_per_move=3, elo=1200)
        CorrespondenceQueue.objects.create(user=u2, days_per_move=3, elo=1250)
        paired = pair_correspondence_queues()
        self.assertEqual(paired, 1)
        self.assertEqual(CorrespondenceQueue.objects.count(), 0)
        self.assertEqual(Game.objects.filter(mode=Game.Mode.CORRESPONDENCE).count(), 1)
