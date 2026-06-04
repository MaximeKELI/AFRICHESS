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
            "is_vs_ai", "ai_difficulty", "ai_target_elo", "moves", "analysis",
            "created_at", "started_at", "ended_at",
        ]


class GameListSerializer(serializers.ModelSerializer):
    white_player = UserPublicSerializer(read_only=True)
    black_player = UserPublicSerializer(read_only=True)

    class Meta:
        model = Game
        fields = ["id", "white_player", "black_player", "status", "mode", "result", "created_at", "ended_at"]


class CreateAIGameSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["bullet", "blitz", "rapid"], default="blitz")
    difficulty = serializers.IntegerField(min_value=1, max_value=20, required=False)
    ai_elo = serializers.IntegerField(min_value=800, max_value=5000, required=False)
    color = serializers.ChoiceField(choices=["white", "black"], default="white")
    include_comments = serializers.BooleanField(default=False, required=False)


class MakeMoveSerializer(serializers.Serializer):
    uci = serializers.CharField(max_length=10)
    include_comments = serializers.BooleanField(default=False, required=False)
    spent_ms = serializers.IntegerField(min_value=0, required=False)
