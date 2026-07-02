from django.conf import settings

from apps.games.models import Game

from .constants import PROVISIONAL_GAMES_REQUIRED, RATED_MODES
from .glicko2 import Glicko2State, display_rating, rate_period
from .models import PlayerRating, RatingHistory


class RatingService:
    K_FACTORS = {
        "bullet": settings.K_FACTOR_BULLET,
        "blitz": settings.K_FACTOR_BLITZ,
        "rapid": settings.K_FACTOR_RAPID,
        "classical": 16,
        "puzzle": 32,
    }

    def get_or_create_rating(self, user, mode: str) -> PlayerRating:
        rating, _ = PlayerRating.objects.get_or_create(
            user=user,
            mode=mode,
            defaults={"elo": user.initial_elo, "peak_elo": user.initial_elo},
        )
        return rating

    def expected_score(self, elo_a: int, elo_b: int) -> float:
        return 1 / (1 + 10 ** ((elo_b - elo_a) / 400))

    def update_ratings(self, game: Game):
        if game.is_vs_ai or not game.white_player or not game.black_player:
            return
        if not getattr(game, "is_rated", True):
            return
        if RatingHistory.objects.filter(game=game).exists():
            return

        if getattr(settings, "USE_GLICKO2", False):
            self._update_glicko2(game)
            return

        mode = game.mode if game.mode != Game.Mode.AI else "blitz"
        k = self.K_FACTORS.get(mode, 32)

        white_rating = self.get_or_create_rating(game.white_player, mode)
        black_rating = self.get_or_create_rating(game.black_player, mode)

        expected_white = self.expected_score(white_rating.elo, black_rating.elo)
        expected_black = 1.0 - expected_white

        if game.result == Game.Result.WHITE_WIN:
            score_white, score_black = 1.0, 0.0
        elif game.result == Game.Result.BLACK_WIN:
            score_white, score_black = 0.0, 1.0
        else:
            score_white, score_black = 0.5, 0.5

        k_white = self._effective_k(white_rating, k)
        k_black = self._effective_k(black_rating, k)
        delta_white = round(k_white * (score_white - expected_white))
        delta_black = round(k_black * (score_black - expected_black))

        self._apply_change(white_rating, delta_white, game)
        self._apply_change(black_rating, delta_black, game)

    def _effective_k(self, rating: PlayerRating, base_k: int) -> int:
        """K plus élevé pour les classements provisoires (convergence rapide, style Chess.com)."""
        from .provisional import is_provisional

        if is_provisional(rating):
            return max(base_k, 40)
        return base_k

    def _apply_change(self, rating: PlayerRating, delta: int, game: Game):
        elo_before = rating.elo
        rating.elo = max(100, rating.elo + delta)
        rating.peak_elo = max(rating.peak_elo, rating.elo)
        rating.games_count += 1
        rating.save()
        RatingHistory.objects.create(
            user=rating.user,
            mode=rating.mode,
            elo_before=elo_before,
            elo_after=rating.elo,
            change=delta,
            game=game,
        )

    def _update_glicko2(self, game: Game) -> None:
        mode = game.mode if game.mode != Game.Mode.AI else "blitz"
        white_rating = self.get_or_create_rating(game.white_player, mode)
        black_rating = self.get_or_create_rating(game.black_player, mode)

        if game.result == Game.Result.WHITE_WIN:
            score_white, score_black = 1.0, 0.0
        elif game.result == Game.Result.BLACK_WIN:
            score_white, score_black = 0.0, 1.0
        else:
            score_white, score_black = 0.5, 0.5

        w_state = Glicko2State(white_rating.elo, white_rating.rd, white_rating.volatility)
        b_state = Glicko2State(black_rating.elo, black_rating.rd, black_rating.volatility)

        w_new = rate_period(w_state, [b_state], [score_white])
        b_new = rate_period(b_state, [w_state], [score_black])

        self._apply_glicko_change(white_rating, w_new, game)
        self._apply_glicko_change(black_rating, b_new, game)

    def _apply_glicko_change(self, rating: PlayerRating, state: Glicko2State, game: Game) -> None:
        elo_before = rating.elo
        rating.elo = display_rating(state)
        rating.rd = max(45.0, round(state.rd, 2))
        rating.volatility = round(state.volatility, 6)
        rating.peak_elo = max(rating.peak_elo, rating.elo)
        rating.games_count += 1
        rating.save()
        RatingHistory.objects.create(
            user=rating.user,
            mode=rating.mode,
            elo_before=elo_before,
            elo_after=rating.elo,
            change=rating.elo - elo_before,
            game=game,
        )

    def update_puzzle_rating(self, user, puzzle_rating: int, solved: bool) -> PlayerRating:
        """Met à jour l'Elo puzzle du joueur après une tentative."""
        rating = self.get_or_create_rating(user, "puzzle")
        k = self.K_FACTORS["puzzle"]
        expected = self.expected_score(rating.elo, puzzle_rating)
        score = 1.0 if solved else 0.0
        delta = round(k * (score - expected))
        elo_before = rating.elo
        rating.elo = max(100, rating.elo + delta)
        rating.peak_elo = max(rating.peak_elo, rating.elo)
        rating.games_count += 1
        rating.save()
        RatingHistory.objects.create(
            user=user,
            mode="puzzle",
            elo_before=elo_before,
            elo_after=rating.elo,
            change=delta,
            game=None,
        )
        return rating
