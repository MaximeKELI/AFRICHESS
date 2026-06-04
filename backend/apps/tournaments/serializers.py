from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .models import Tournament, TournamentParticipant


class TournamentParticipantSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)

    class Meta:
        model = TournamentParticipant
        fields = [
            "user",
            "score",
            "wins",
            "draws",
            "losses",
            "games_played",
        ]


class TournamentSerializer(serializers.ModelSerializer):
    created_by = UserPublicSerializer(read_only=True)
    participant_count = serializers.SerializerMethodField()
    standings = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "format",
            "status",
            "mode",
            "max_players",
            "country",
            "is_african_cup",
            "prize_pool",
            "starts_at",
            "ends_at",
            "created_by",
            "participant_count",
            "standings",
            "created_at",
        ]

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_standings(self, obj):
        qs = TournamentParticipant.objects.filter(tournament=obj).select_related(
            "user"
        )[:20]
        return TournamentParticipantSerializer(qs, many=True).data
