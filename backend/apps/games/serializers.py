from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .models import Game, GameAnalysis, Move


class MoveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Move
        fields = [
            "move_number",
            "san",
            "uci",
            "from_square",
            "to_square",
            "played_by_white",
            "time_remaining_ms",
            "comment",
            "created_at",
        ]


class GameAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameAnalysis
        fields = ["accuracy_white", "accuracy_black", "blunders_white", "blunders_black", "best_moves_json"]


class GameSerializer(serializers.ModelSerializer):
    white_player = UserPublicSerializer(read_only=True)
    black_player = UserPublicSerializer(read_only=True)
    moves = MoveSerializer(many=True, read_only=True)
    analysis = GameAnalysisSerializer(read_only=True)

    class Meta:
        model = Game
        fields = [
            "id", "white_player", "black_player", "status", "mode", "result",
            "fen", "pgn", "move_count", "white_time_ms", "black_time_ms",
            "increment_ms",
            "is_timed", "time_control_minutes",
            "is_vs_ai", "ai_difficulty", "ai_target_elo", "moves", "analysis",
            "termination_reason",
            "created_at", "started_at", "ended_at",
        ]


class GameListSerializer(serializers.ModelSerializer):
    white_player = UserPublicSerializer(read_only=True)
    black_player = UserPublicSerializer(read_only=True)

    class Meta:
        model = Game
        fields = [
            "id",
            "white_player",
            "black_player",
            "status",
            "mode",
            "result",
            "is_vs_ai",
            "ai_target_elo",
            "created_at",
            "ended_at",
        ]


class CreateAIGameSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["bullet", "blitz", "rapid"], default="blitz")
    difficulty = serializers.IntegerField(min_value=1, max_value=20, required=False)
    ai_elo = serializers.IntegerField(min_value=100, max_value=5000, required=False)
    color = serializers.ChoiceField(choices=["white", "black"], default="white")
    include_comments = serializers.BooleanField(default=False, required=False)
    is_timed = serializers.BooleanField(default=True, required=False)
    time_minutes = serializers.IntegerField(required=False, allow_null=True)

    def validate_time_minutes(self, value):
        if value is None:
            return value
        from .time_control import ALLOWED_TIME_MINUTES

        if value not in ALLOWED_TIME_MINUTES:
            raise serializers.ValidationError(
                "Durée autorisée : 5, 10, 15, 20, 25 ou 30 minutes."
            )
        return value


class MatchmakingJoinSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["bullet", "blitz", "rapid"], default="blitz")
    is_timed = serializers.BooleanField(default=True, required=False)
    time_minutes = serializers.IntegerField(required=False, allow_null=True)

    def validate_time_minutes(self, value):
        if value is None:
            return value
        from .time_control import ALLOWED_TIME_MINUTES

        if value not in ALLOWED_TIME_MINUTES:
            raise serializers.ValidationError(
                "Durée autorisée : 5, 10, 15, 20, 25 ou 30 minutes."
            )
        return value


class MakeMoveSerializer(serializers.Serializer):
    uci = serializers.CharField(max_length=10)
    include_comments = serializers.BooleanField(default=False, required=False)
    spent_ms = serializers.IntegerField(min_value=0, required=False)
