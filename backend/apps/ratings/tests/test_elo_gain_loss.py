"""Tests gain/perte ELO : signes opposés, formule, conservation entre joueurs."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.games.game_actions import accept_draw, resign_game
from apps.games.models import Game
from apps.games.services import GameService
from apps.ratings.constants import PROVISIONAL_GAMES_REQUIRED
from apps.ratings.game_payload import rating_changes_for_game
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


def _set_elos(white, black, white_elo: int, black_elo: int, *, established: bool = True):
    """Fixe les ELO initiaux ; established=True évite le K provisoire (40)."""
    games_count = PROVISIONAL_GAMES_REQUIRED if established else 0
    PlayerRating.objects.update_or_create(
        user=white,
        mode="blitz",
        defaults={"elo": white_elo, "peak_elo": white_elo, "games_count": games_count},
    )
    PlayerRating.objects.update_or_create(
        user=black,
        mode="blitz",
        defaults={"elo": black_elo, "peak_elo": black_elo, "games_count": games_count},
    )


def _finish(game: Game, result: str):
    game.result = result
    game.status = Game.Status.COMPLETED
    game.save()
    RatingService().update_ratings(game)


def _histories(game: Game):
    white = RatingHistory.objects.get(game=game, user=game.white_player)
    black = RatingHistory.objects.get(game=game, user=game.black_player)
    return white, black


def _expected_deltas(svc: RatingService, white_elo: int, black_elo: int, result: str, k: int = 32):
    exp_w = svc.expected_score(white_elo, black_elo)
    exp_b = 1.0 - exp_w
    if result == Game.Result.WHITE_WIN:
        score_w, score_b = 1.0, 0.0
    elif result == Game.Result.BLACK_WIN:
        score_w, score_b = 0.0, 1.0
    else:
        score_w, score_b = 0.5, 0.5
    return (
        round(k * (score_w - exp_w)),
        round(k * (score_b - exp_b)),
    )


@override_settings(K_FACTOR_BLITZ=32, USE_GLICKO2=False)
class EloGainLossTests(TestCase):
    def setUp(self):
        self.white = User.objects.create_user(username="gain_w", password="x", chess_level="intermediate")
        self.black = User.objects.create_user(username="gain_b", password="x", chess_level="intermediate")
        self.svc = RatingService()

    def _assert_integrity(self, game: Game, *, expect_zero_sum: bool = True):
        """Vérifie elo_after = elo_before + change et cohérence PlayerRating."""
        white_h, black_h = _histories(game)
        for hist in (white_h, black_h):
            self.assertEqual(hist.elo_after, hist.elo_before + hist.change)
            rating = PlayerRating.objects.get(user=hist.user, mode="blitz")
            self.assertEqual(rating.elo, hist.elo_after)

        if expect_zero_sum:
            self.assertEqual(white_h.change + black_h.change, 0)

    def test_equal_elo_white_win_plus_minus_sixteen(self):
        _set_elos(self.white, self.black, 1200, 1200)
        game = _rated_game(self.white, self.black)
        _finish(game, Game.Result.WHITE_WIN)

        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, 16)
        self.assertEqual(black_h.change, -16)
        self.assertEqual(white_h.elo_after, 1216)
        self.assertEqual(black_h.elo_after, 1184)
        self._assert_integrity(game)

    def test_equal_elo_black_win_minus_plus_sixteen(self):
        _set_elos(self.white, self.black, 1200, 1200)
        game = _rated_game(self.white, self.black)
        _finish(game, Game.Result.BLACK_WIN)

        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, -16)
        self.assertEqual(black_h.change, 16)
        self._assert_integrity(game)

    def test_equal_elo_draw_no_change(self):
        _set_elos(self.white, self.black, 1200, 1200)
        game = _rated_game(self.white, self.black)
        _finish(game, Game.Result.DRAW)

        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, 0)
        self.assertEqual(black_h.change, 0)
        self._assert_integrity(game)

    def test_winner_gains_loser_loses_opposite_signs(self):
        _set_elos(self.white, self.black, 1200, 1200)
        game = _rated_game(self.white, self.black)
        _finish(game, Game.Result.WHITE_WIN)

        white_h, black_h = _histories(game)
        self.assertGreater(white_h.change, 0)
        self.assertLess(black_h.change, 0)
        self.assertEqual(abs(white_h.change), abs(black_h.change))

    def test_underdog_win_gains_more_than_favorite_win(self):
        _set_elos(self.white, self.black, 1400, 1200)

        underdog_game = _rated_game(self.white, self.black)
        _finish(underdog_game, Game.Result.BLACK_WIN)
        underdog_gain = _histories(underdog_game)[1].change

        _set_elos(self.white, self.black, 1400, 1200)
        favorite_game = _rated_game(self.white, self.black)
        _finish(favorite_game, Game.Result.WHITE_WIN)
        favorite_gain = _histories(favorite_game)[0].change

        self.assertGreater(underdog_gain, favorite_gain)

    def test_draw_unequal_elo_lower_rated_gains_higher_loses(self):
        _set_elos(self.white, self.black, 1500, 1300)
        game = _rated_game(self.white, self.black)
        _finish(game, Game.Result.DRAW)

        white_h, black_h = _histories(game)
        self.assertLess(white_h.change, 0)
        self.assertGreater(black_h.change, 0)
        self._assert_integrity(game)

    def test_deltas_match_rating_formula(self):
        _set_elos(self.white, self.black, 1350, 1180)
        game = _rated_game(self.white, self.black)
        _finish(game, Game.Result.WHITE_WIN)

        expected_w, expected_b = _expected_deltas(self.svc, 1350, 1180, Game.Result.WHITE_WIN)
        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, expected_w)
        self.assertEqual(black_h.change, expected_b)
        self._assert_integrity(game)

    def test_resign_white_loser_loses_winner_gains(self):
        _set_elos(self.white, self.black, 1200, 1200)
        game = _rated_game(self.white, self.black)
        resign_game(game, self.white)
        game.refresh_from_db()

        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, -16)
        self.assertEqual(black_h.change, 16)
        self._assert_integrity(game)

    def test_resign_black_loser_loses_winner_gains(self):
        _set_elos(self.white, self.black, 1200, 1200)
        game = _rated_game(self.white, self.black)
        resign_game(game, self.black)
        game.refresh_from_db()

        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, 16)
        self.assertEqual(black_h.change, -16)
        self._assert_integrity(game)

    def test_timeout_winner_gains_loser_loses(self):
        _set_elos(self.white, self.black, 1200, 1200)
        game = _rated_game(self.white, self.black)
        svc = GameService()
        svc._finalize_game_on_timeout(game, winner_white=False)
        game.save()
        svc._after_human_game_finished(game)

        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, -16)
        self.assertEqual(black_h.change, 16)
        self._assert_integrity(game)

    def test_accept_draw_both_players_updated(self):
        _set_elos(self.white, self.black, 1450, 1450)
        game = _rated_game(self.white, self.black)
        game.draw_offered_by = self.white
        game.save()
        accept_draw(game, self.black)

        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, 0)
        self.assertEqual(black_h.change, 0)
        self._assert_integrity(game)

    def test_rating_payload_matches_history(self):
        _set_elos(self.white, self.black, 1200, 1200)
        game = _rated_game(self.white, self.black)
        resign_game(game, self.white)
        game.refresh_from_db()

        payload = rating_changes_for_game(game)
        white_h, black_h = _histories(game)

        self.assertEqual(payload["white"]["change"], white_h.change)
        self.assertEqual(payload["white"]["elo_before"], white_h.elo_before)
        self.assertEqual(payload["white"]["elo_after"], white_h.elo_after)
        self.assertEqual(payload["black"]["change"], black_h.change)
        self.assertEqual(payload["black"]["elo_before"], black_h.elo_before)
        self.assertEqual(payload["black"]["elo_after"], black_h.elo_after)
        self.assertEqual(payload["white"]["change"], -payload["black"]["change"])

    def test_provisional_players_each_gain_loss_correct_math(self):
        """K provisoire (40) : somme des deltas ≠ 0 possible, mais chaque joueur reste cohérent."""
        _set_elos(self.white, self.black, 1200, 1200, established=False)
        game = _rated_game(self.white, self.black)
        _finish(game, Game.Result.WHITE_WIN)

        expected_w, expected_b = _expected_deltas(
            self.svc, 1200, 1200, Game.Result.WHITE_WIN, k=40
        )
        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, expected_w)
        self.assertEqual(black_h.change, expected_b)
        self.assertEqual(white_h.change, 20)
        self.assertEqual(black_h.change, -20)
        self._assert_integrity(game, expect_zero_sum=True)

    def test_low_elo_player_loses_points_on_defeat(self):
        """Joueur à bas ELO : défaite bien retranchée (sans atteindre le plancher 100)."""
        _set_elos(self.white, self.black, 200, 200)
        game = _rated_game(self.white, self.black)
        _finish(game, Game.Result.BLACK_WIN)

        white_h, black_h = _histories(game)
        self.assertEqual(white_h.change, -16)
        self.assertEqual(black_h.change, 16)
        self.assertEqual(white_h.elo_after, 184)
        self.assertEqual(black_h.elo_after, 216)
        self._assert_integrity(game)
