from django.conf import settings
from rest_framework import serializers

from .constants import PROVISIONAL_GAMES_REQUIRED
from .display import format_rating_display
from .models import LeagueSeason, LeagueStanding, PlayerRating, RatingHistory
from .provisional import games_until_established, is_provisional


class PlayerRatingSerializer(serializers.ModelSerializer):
    is_provisional = serializers.SerializerMethodField()
    games_until_established = serializers.SerializerMethodField()
    is_established = serializers.SerializerMethodField()
    rating_display = serializers.SerializerMethodField()

    class Meta:
        model = PlayerRating
        fields = [
            "mode",
            "elo",
            "rd",
            "peak_elo",
            "games_count",
            "updated_at",
            "is_provisional",
            "games_until_established",
            "is_established",
            "rating_display",
        ]

    def get_rating_display(self, obj: PlayerRating) -> str:
        return format_rating_display(obj.elo, obj.rd, obj.games_count)

    def get_is_provisional(self, obj: PlayerRating) -> bool:
        return is_provisional(obj)

    def get_games_until_established(self, obj: PlayerRating) -> int:
        return games_until_established(obj)

    def get_is_established(self, obj: PlayerRating) -> bool:
        return not is_provisional(obj)


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    is_provisional = serializers.SerializerMethodField()
    rating_display = serializers.SerializerMethodField()

    class Meta:
        model = PlayerRating
        fields = ["user", "mode", "elo", "rd", "peak_elo", "games_count", "is_provisional", "rating_display"]

    def get_is_provisional(self, obj: PlayerRating) -> bool:
        return is_provisional(obj)

    def get_rating_display(self, obj: PlayerRating) -> str:
        return format_rating_display(obj.elo, obj.rd, obj.games_count)


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
