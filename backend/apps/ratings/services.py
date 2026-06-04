from django.conf import settings

from apps.games.models import Game

from .models import PlayerRating, RatingHistory


class RatingService:
    K_FACTORS = {
        "bullet": settings.K_FACTOR_BULLET,
        "blitz": settings.K_FACTOR_BLITZ,
        "rapid": settings.K_FACTOR_RAPID,
        "classical": 16,
    }

    def get_or_create_rating(self, user, mode: str) -> PlayerRating:
        rating, _ = PlayerRating.objects.get_or_create(
            user=user, mode=mode, defaults={"elo": settings.DEFAULT_ELO}
        )
        return rating

    def expected_score(self, elo_a: int, elo_b: int) -> float:
        return 1 / (1 + 10 ** ((elo_b - elo_a) / 400))

    def update_ratings(self, game: Game):
        if game.is_vs_ai or not game.white_player or not game.black_player:
            return

        mode = game.mode if game.mode != Game.Mode.AI else "blitz"
        k = self.K_FACTORS.get(mode, 32)

        white_rating = self.get_or_create_rating(game.white_player, mode)
        black_rating = self.get_or_create_rating(game.black_player, mode)

        expected_white = self.expected_score(white_rating.elo, black_rating.elo)

        if game.result == Game.Result.WHITE_WIN:
            score_white = 1.0
        elif game.result == Game.Result.BLACK_WIN:
            score_white = 0.0
        else:
            score_white = 0.5

        delta_white = round(k * (score_white - expected_white))
        delta_black = -delta_white

        self._apply_change(white_rating, delta_white, game)
        self._apply_change(black_rating, delta_black, game)

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
