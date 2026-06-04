from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .models import Game, GameAnalysis, Move


class MoveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Move
        fields = ["move_number", "san", "uci", "played_by_white", "time_remaining_ms", "created_at"]


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
            "is_vs_ai", "ai_difficulty", "moves", "analysis",
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
    difficulty = serializers.IntegerField(min_value=1, max_value=10, default=5)
    color = serializers.ChoiceField(choices=["white", "black"], default="white")


class MakeMoveSerializer(serializers.Serializer):
    uci = serializers.CharField(max_length=10)
