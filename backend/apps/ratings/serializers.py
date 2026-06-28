from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .constants import PROVISIONAL_GAMES_REQUIRED
from .models import LeagueSeason, LeagueStanding, PlayerRating, RatingHistory
from .provisional import games_until_established, is_provisional


class PlayerRatingSerializer(serializers.ModelSerializer):
    is_provisional = serializers.SerializerMethodField()
    games_until_established = serializers.SerializerMethodField()
    is_established = serializers.SerializerMethodField()

    class Meta:
        model = PlayerRating
        fields = [
            "mode",
            "elo",
            "peak_elo",
            "games_count",
            "updated_at",
            "is_provisional",
            "games_until_established",
            "is_established",
        ]

    def get_is_provisional(self, obj: PlayerRating) -> bool:
        return is_provisional(obj)

    def get_games_until_established(self, obj: PlayerRating) -> int:
        return games_until_established(obj)

    def get_is_established(self, obj: PlayerRating) -> bool:
        return not is_provisional(obj)


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    is_provisional = serializers.SerializerMethodField()

    class Meta:
        model = PlayerRating
        fields = ["user", "mode", "elo", "peak_elo", "games_count", "is_provisional"]

    def get_is_provisional(self, obj: PlayerRating) -> bool:
        return is_provisional(obj)


class RatingHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RatingHistory
        fields = ["mode", "elo_before", "elo_after", "change", "created_at"]


class LeagueSeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeagueSeason
        fields = ["name", "slug", "is_active", "started_at", "ends_at"]


class LeagueStandingSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    season = LeagueSeasonSerializer(read_only=True)

    class Meta:
        model = LeagueStanding
        fields = [
            "tier",
            "points",
            "wins",
            "draws",
            "losses",
            "games",
            "user",
            "season",
            "updated_at",
        ]
