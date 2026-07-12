from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .models import Tournament, TournamentParticipant


class TournamentParticipantSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    club_name = serializers.SerializerMethodField()

    class Meta:
        model = TournamentParticipant
        fields = [
            "user",
            "score",
            "wins",
            "draws",
            "losses",
            "games_played",
            "is_available",
            "club_name",
        ]

    def get_club_name(self, obj):
        return obj.club.name if obj.club_id else None


class TournamentSerializer(serializers.ModelSerializer):
    created_by = UserPublicSerializer(read_only=True)
    participant_count = serializers.SerializerMethodField()
    standings = serializers.SerializerMethodField()
    club_a_name = serializers.SerializerMethodField()
    club_b_name = serializers.SerializerMethodField()

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
            "is_international_cup",
            "is_rated",
            "prize_pool",
            "starts_at",
            "ends_at",
            "total_rounds",
            "current_round",
            "created_by",
            "participant_count",
            "standings",
            "club_a",
            "club_b",
            "club_a_name",
            "club_b_name",
            "created_at",
        ]

    def get_club_a_name(self, obj):
        return obj.club_a.name if obj.club_a_id else None

    def get_club_b_name(self, obj):
        return obj.club_b.name if obj.club_b_id else None

    def get_participant_count(self, obj):
        if hasattr(obj, "participant_count"):
            return obj.participant_count
        return TournamentParticipant.objects.filter(tournament=obj).count()

    def get_standings(self, obj):
        top = getattr(obj, "top_standings", None)
        if top is not None:
            qs = top
        else:
            qs = TournamentParticipant.objects.filter(tournament=obj).select_related(
                "user", "user__stats", "club"
            )[:20]
        return TournamentParticipantSerializer(qs, many=True).data
