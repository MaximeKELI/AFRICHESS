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
        self.assertEqual(second.white_player_id, self.white.id)
        self.assertEqual(second.black_player_id, self.black.id)
        self.assertFalse(CorrespondenceQueue.objects.filter(user=self.white).exists())

    def test_my_correspondence_games_lists_active(self):
        game = create_correspondence_game(self.white, self.black, days_per_move=5)
        qs = my_correspondence_games(self.white)
        self.assertEqual(qs.count(), 1)
        self.assertEqual(qs.first().id, game.id)
