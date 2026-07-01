"""Tests distribution ELO après victoire / défaite / nulle (style Chess.com)."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.games.game_actions import accept_draw, resign_game
from apps.games.models import Game
from apps.games.services import GameService
from apps.ratings.constants import PROVISIONAL_GAMES_REQUIRED
from apps.ratings.models import PlayerRating, RatingHistory
from apps.ratings.services import RatingService

User = get_user_model()


def _rated_game(white, black, mode="blitz") -> Game:
    return Game.objects.create(
        white_player=white,
        black_player=black,
        mode=mode,
        status=Game.Status.ACTIVE,
        is_vs_ai=False,
        is_rated=True,
        started_at=timezone.now(),
    )


@override_settings(K_FACTOR_BLITZ=32)
class RatingDistributionTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="elo_w", password="x", chess_level="intermediate")
        self.black = User.objects.create_user(username="elo_b", password="x", chess_level="intermediate")
        self.svc = RatingService()

    def test_equal_elo_win_loss_symmetric(self):
        game = _rated_game(self.white, self.black)
        game.result = Game.Result.WHITE_WIN
        game.status = Game.Status.COMPLETED
        game.save()

        self.svc.update_ratings(game)

        white = PlayerRating.objects.get(user=self.white, mode="blitz")
        black = PlayerRating.objects.get(user=self.black, mode="blitz")
        self.assertGreater(white.elo, 1200)
        self.assertLess(black.elo, 1200)
        self.assertEqual(white.elo - 1200, 1200 - black.elo)

    def test_resign_updates_both_ratings(self):
        game = _rated_game(self.white, self.black)
        resign_game(game, self.white)
        game.refresh_from_db()

        self.assertEqual(game.result, Game.Result.BLACK_WIN)
        self.assertEqual(RatingHistory.objects.filter(game=game).count(), 2)
        white_hist = RatingHistory.objects.get(game=game, user=self.white)
        black_hist = RatingHistory.objects.get(game=game, user=self.black)
        self.assertLess(white_hist.change, 0)
        self.assertGreater(black_hist.change, 0)

    def test_draw_gives_smaller_changes(self):
        game = _rated_game(self.white, self.black)
        GameService().get_or_create_rating = self.svc.get_or_create_rating  # noqa: not needed
        PlayerRating.objects.filter(user=self.white, mode="blitz").update(elo=1400)
        PlayerRating.objects.filter(user=self.black, mode="blitz").update(elo=1400)

        game.result = Game.Result.DRAW
        game.status = Game.Status.COMPLETED
        game.save()
        self.svc.update_ratings(game)

        white = RatingHistory.objects.get(game=game, user=self.white)
        black = RatingHistory.objects.get(game=game, user=self.black)
        self.assertEqual(white.change, 0)
        self.assertEqual(black.change, 0)

    def test_unrated_game_skips_elo(self):
        game = _rated_game(self.white, self.black)
        game.is_rated = False
        game.result = Game.Result.WHITE_WIN
        game.status = Game.Status.COMPLETED
        game.save()

        self.svc.update_ratings(game)
        self.assertEqual(RatingHistory.objects.filter(game=game).count(), 0)

    def test_ai_game_skips_elo(self):
        game = Game.objects.create(
            white_player=self.white,
            mode=Game.Mode.AI,
            status=Game.Status.COMPLETED,
            is_vs_ai=True,
            is_rated=True,
            result=Game.Result.WHITE_WIN,
        )
        self.svc.update_ratings(game)
        self.assertEqual(RatingHistory.objects.filter(game=game).count(), 0)

    def test_idempotent_no_double_update(self):
        game = _rated_game(self.white, self.black)
        game.result = Game.Result.WHITE_WIN
        game.status = Game.Status.COMPLETED
        game.save()

        self.svc.update_ratings(game)
        self.svc.update_ratings(game)
        self.assertEqual(RatingHistory.objects.filter(game=game).count(), 2)

    def test_provisional_player_gets_higher_k(self):
        """Joueur provisoire (< 5 parties) : variations plus fortes."""
        game = _rated_game(self.white, self.black)
        game.result = Game.Result.WHITE_WIN
        game.status = Game.Status.COMPLETED
        game.save()

        self.svc.update_ratings(game)
        prov_change = RatingHistory.objects.get(game=game, user=self.white).change

        PlayerRating.objects.filter(user=self.white, mode="blitz").update(
            games_count=PROVISIONAL_GAMES_REQUIRED
        )
        game2 = _rated_game(self.white, self.black)
        game2.result = Game.Result.WHITE_WIN
        game2.status = Game.Status.COMPLETED
        game2.save()
        self.svc.update_ratings(game2)
        est_change = RatingHistory.objects.get(game=game2, user=self.white).change

        self.assertGreater(abs(prov_change), abs(est_change))

    def test_timeout_path_updates_elo(self):
        game = _rated_game(self.white, self.black)
        svc = GameService()
        svc._finalize_game_on_timeout(game, winner_white=True)
        game.save()
        svc._after_human_game_finished(game)

        self.assertEqual(RatingHistory.objects.filter(game=game).count(), 2)
        self.assertGreater(
            RatingHistory.objects.get(game=game, user=self.white).change, 0
        )

    def test_accept_draw_updates_elo(self):
        game = _rated_game(self.white, self.black)
        game.draw_offered_by = self.white
        game.save()
        accept_draw(game, self.black)
        self.assertEqual(RatingHistory.objects.filter(game=game).count(), 2)


@override_settings(K_FACTOR_BULLET=40, K_FACTOR_BLITZ=32, K_FACTOR_RAPID=24)
class RatingModeKFactorTests(TestCase):
    def test_k_factor_by_mode(self):
        svc = RatingService()
        self.assertEqual(svc.K_FACTORS["bullet"], 40)
        self.assertEqual(svc.K_FACTORS["blitz"], 32)
        self.assertEqual(svc.K_FACTORS["rapid"], 24)
