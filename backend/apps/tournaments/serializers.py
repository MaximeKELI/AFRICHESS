from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .models import Tournament


class TournamentSerializer(serializers.ModelSerializer):
    created_by = UserPublicSerializer(read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            "id", "name", "slug", "description", "format", "status", "mode",
            "max_players", "country", "is_african_cup", "prize_pool",
            "starts_at", "ends_at", "created_by", "participant_count", "created_at",
        ]

    def get_participant_count(self, obj):
        return obj.participants.count()
