from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .models import LeagueSeason, LeagueStanding, PlayerRating, RatingHistory


class PlayerRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerRating
        fields = ["mode", "elo", "peak_elo", "games_count", "updated_at"]


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)

    class Meta:
        model = PlayerRating
        fields = ["user", "mode", "elo", "peak_elo", "games_count"]


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
