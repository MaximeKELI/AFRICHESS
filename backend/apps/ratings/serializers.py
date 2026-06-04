from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .models import PlayerRating, RatingHistory


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
