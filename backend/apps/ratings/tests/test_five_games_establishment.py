"""Après 5 parties en ligne classées vs humains : classement établi et ELO = performances."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.game_actions import resign_game
from apps.games.models import Game
from apps.ratings.constants import PROVISIONAL_GAMES_REQUIRED
from apps.ratings.models import PlayerRating, RatingHistory
from apps.ratings.provisional import is_provisional, player_rating_info
from apps.ratings.services import RatingService
from apps.users.setup import setup_new_user

User = get_user_model()


def _rated_game(white, black, mode="blitz", *, is_rated=True) -> Game:
    return Game.objects.create(
        white_player=white,
        black_player=black,
        mode=mode,
        status=Game.Status.ACTIVE,
        is_vs_ai=False,
        is_rated=is_rated,
        started_at=timezone.now(),
    )


def _established_opponent(username: str, elo: int = 1200):
    user = User.objects.create_user(
        username=username,
        password="x",
        chess_level="intermediate",
    )
    setup_new_user(user)
    rating = PlayerRating.objects.get(user=user, mode="blitz")
    rating.elo = elo
    rating.peak_elo = elo
    rating.games_count = PROVISIONAL_GAMES_REQUIRED
    rating.save()
    return user


def _new_player(username: str, chess_level: str = "intermediate"):
    user = User.objects.create_user(
        username=username,
        password="x",
        chess_level=chess_level,
    )
    setup_new_user(user)
    return user


def _finish_by_resignation(game: Game, loser):
    resign_game(game, loser)
    game.refresh_from_db()


@override_settings(K_FACTOR_BLITZ=32)
class FiveHumanGamesEstablishmentTests(TestCase):
    """Vérifie le passage provisoire → établi après 5 parties humaines classées."""

    def setUp(self):
        self.opponent = _established_opponent("opp_est", 1200)

    def _play_win(self, player, *, as_white=True):
        if as_white:
            game = _rated_game(player, self.opponent)
        else:
            game = _rated_game(self.opponent, player)
        _finish_by_resignation(game, self.opponent)
        return game

    def _play_loss(self, player, *, as_white=True):
        if as_white:
            game = _rated_game(player, self.opponent)
            _finish_by_resignation(game, player)
        else:
            game = _rated_game(self.opponent, player)
            _finish_by_resignation(game, player)
        return game

    def test_provisional_countdown_over_five_rated_human_games(self):
        player = _new_player("prog_player")

        for played in range(1, PROVISIONAL_GAMES_REQUIRED + 1):
            self._play_win(player, as_white=played % 2 == 1)
            rating = PlayerRating.objects.get(user=player, mode="blitz")
            info = player_rating_info(player, "blitz")

            self.assertEqual(rating.games_count, played)
            if played < PROVISIONAL_GAMES_REQUIRED:
                self.assertTrue(info["is_provisional"])
                self.assertEqual(
                    info["games_until_established"],
                    PROVISIONAL_GAMES_REQUIRED - played,
                )
            else:
                self.assertFalse(info["is_provisional"])
                self.assertEqual(info["games_until_established"], 0)
                self.assertTrue(info["is_established"])

    def test_elo_after_five_games_equals_initial_plus_sum_of_changes(self):
        player = _new_player("cumul_player")
        initial = player.initial_elo

        outcomes = ["win", "loss", "win", "draw", "win"]
        for i, outcome in enumerate(outcomes):
            if outcome == "win":
                self._play_win(player, as_white=i % 2 == 0)
            elif outcome == "loss":
                self._play_loss(player, as_white=i % 2 == 0)
            else:
                game = _rated_game(player, self.opponent)
                game.draw_offered_by = self.opponent
                game.save()
                from apps.games.game_actions import accept_draw

                accept_draw(game, player)

        histories = list(
            RatingHistory.objects.filter(user=player, mode="blitz").order_by("created_at")
        )
        self.assertEqual(len(histories), PROVISIONAL_GAMES_REQUIRED)

        total_change = sum(h.change for h in histories)
        rating = PlayerRating.objects.get(user=player, mode="blitz")

        self.assertEqual(rating.elo, initial + total_change)
        for hist in histories:
            self.assertEqual(hist.elo_after, hist.elo_before + hist.change)
            self.assertIsNotNone(hist.game_id)

    def test_winning_five_games_yields_higher_elo_than_losing_five(self):
        winner = _new_player("five_wins")
        loser = _new_player("five_losses")

        for i in range(PROVISIONAL_GAMES_REQUIRED):
            self._play_win(winner, as_white=i % 2 == 0)
            self._play_loss(loser, as_white=i % 2 == 0)

        winner_rating = PlayerRating.objects.get(user=winner, mode="blitz")
        loser_rating = PlayerRating.objects.get(user=loser, mode="blitz")

        self.assertFalse(is_provisional(winner_rating))
        self.assertFalse(is_provisional(loser_rating))
        self.assertGreater(winner_rating.elo, winner.initial_elo)
        self.assertLess(loser_rating.elo, loser.initial_elo)
        self.assertGreater(winner_rating.elo, loser_rating.elo)

    def test_mixed_performance_elo_between_win_all_and_lose_all(self):
        """3 victoires, 2 défaites : ELO final entre le scénario tout gagner et tout perdre."""
        mixed = _new_player("mixed_perf")
        all_wins = _new_player("all_wins_ref")
        all_losses = _new_player("all_loss_ref")

        patterns = {
            mixed: ["win", "win", "loss", "win", "loss"],
            all_wins: ["win"] * 5,
            all_losses: ["loss"] * 5,
        }

        for user, pattern in patterns.items():
            for i, outcome in enumerate(pattern):
                if outcome == "win":
                    self._play_win(user, as_white=i % 2 == 0)
                else:
                    self._play_loss(user, as_white=i % 2 == 0)

        mixed_elo = PlayerRating.objects.get(user=mixed, mode="blitz").elo
        wins_elo = PlayerRating.objects.get(user=all_wins, mode="blitz").elo
        losses_elo = PlayerRating.objects.get(user=all_losses, mode="blitz").elo

        self.assertGreater(mixed_elo, losses_elo)
        self.assertLess(mixed_elo, wins_elo)

    def test_unrated_human_games_do_not_count(self):
        player = _new_player("unrated_only")

        for _ in range(3):
            game = _rated_game(player, self.opponent, is_rated=False)
            _finish_by_resignation(game, self.opponent)

        rating = PlayerRating.objects.get(user=player, mode="blitz")
        self.assertEqual(rating.games_count, 0)
        self.assertEqual(rating.elo, player.initial_elo)
        self.assertTrue(is_provisional(rating))
        self.assertEqual(RatingHistory.objects.filter(user=player).count(), 0)

    def test_ai_games_do_not_count_toward_blitz_establishment(self):
        player = _new_player("ai_only")

        for _ in range(3):
            game = Game.objects.create(
                white_player=player,
                mode=Game.Mode.AI,
                status=Game.Status.COMPLETED,
                is_vs_ai=True,
                is_rated=True,
                result=Game.Result.WHITE_WIN,
            )
            RatingService().update_ratings(game)

        rating = PlayerRating.objects.get(user=player, mode="blitz")
        self.assertEqual(rating.games_count, 0)
        self.assertTrue(is_provisional(rating))

    def test_four_rated_plus_one_unrated_stays_provisional(self):
        player = _new_player("four_plus_unrated")

        for _ in range(4):
            self._play_win(player)
        game = _rated_game(player, self.opponent, is_rated=False)
        _finish_by_resignation(game, self.opponent)

        rating = PlayerRating.objects.get(user=player, mode="blitz")
        self.assertEqual(rating.games_count, 4)
        self.assertTrue(is_provisional(rating))

    def test_api_reflects_established_status_after_fifth_game(self):
        player = _new_player("api_player")
        client = APIClient()
        client.force_authenticate(player)

        for i in range(PROVISIONAL_GAMES_REQUIRED):
            self._play_win(player, as_white=i % 2 == 0)
            res = client.get("/api/ratings/me/")
            self.assertEqual(res.status_code, 200)
            rows = res.data.get("results", res.data)
            blitz = next(r for r in rows if r["mode"] == "blitz")

            if i < PROVISIONAL_GAMES_REQUIRED - 1:
                self.assertTrue(blitz["is_provisional"])
                self.assertFalse(blitz["is_established"])
            else:
                self.assertFalse(blitz["is_provisional"])
                self.assertTrue(blitz["is_established"])
                self.assertEqual(blitz["games_until_established"], 0)
                self.assertEqual(blitz["games_count"], PROVISIONAL_GAMES_REQUIRED)

    def test_leaderboard_visible_only_after_fifth_rated_game(self):
        player = _new_player("lb_player")
        client = APIClient()

        res = client.get("/api/ratings/leaderboard/global/?mode=blitz")
        usernames_before = [r["user"]["username"] for r in res.data.get("results", res.data)]
        self.assertNotIn("lb_player", usernames_before)

        for i in range(PROVISIONAL_GAMES_REQUIRED):
            self._play_win(player, as_white=i % 2 == 0)

        res = client.get("/api/ratings/leaderboard/global/?mode=blitz")
        usernames_after = [r["user"]["username"] for r in res.data.get("results", res.data)]
        self.assertIn("lb_player", usernames_after)

    def test_beginner_starting_elo_moves_with_performance(self):
        """Joueur débutant (800) : après 5 victoires vs 1200, ELO nettement au-dessus du départ."""
        beginner = _new_player("beginner_rise", chess_level="beginner")
        self.assertEqual(beginner.initial_elo, 800)

        for i in range(PROVISIONAL_GAMES_REQUIRED):
            self._play_win(beginner, as_white=i % 2 == 0)

        rating = PlayerRating.objects.get(user=beginner, mode="blitz")
        self.assertFalse(is_provisional(rating))
        self.assertGreater(rating.elo, 800)
        self.assertGreater(rating.elo, beginner.initial_elo + 50)

    def test_only_human_rated_games_increment_games_count(self):
        player = _new_player("count_check")

        self._play_win(player)
        self._play_win(player)

        game_ai = Game.objects.create(
            white_player=player,
            mode=Game.Mode.AI,
            status=Game.Status.COMPLETED,
            is_vs_ai=True,
            is_rated=True,
            result=Game.Result.WHITE_WIN,
        )
        RatingService().update_ratings(game_ai)

        game_unrated = _rated_game(player, self.opponent, is_rated=False)
        _finish_by_resignation(game_unrated, self.opponent)

        self._play_win(player)
        self._play_win(player)

        rating = PlayerRating.objects.get(user=player, mode="blitz")
        self.assertEqual(rating.games_count, PROVISIONAL_GAMES_REQUIRED)
        self.assertFalse(is_provisional(rating))
