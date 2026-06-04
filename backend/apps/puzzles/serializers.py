from rest_framework import serializers

from .models import Puzzle, PuzzleAttempt


class PuzzleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Puzzle
        fields = ["id", "fen", "themes", "difficulty", "rating", "plays_count", "success_rate", "is_daily"]
        # solution_moves hidden from client until solved


class PuzzleDetailSerializer(PuzzleSerializer):
    class Meta(PuzzleSerializer.Meta):
        fields = PuzzleSerializer.Meta.fields + ["solution_moves"]


class PuzzleAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PuzzleAttempt
        fields = ["puzzle", "solved", "moves_played", "time_seconds", "created_at"]
        read_only_fields = ["created_at"]


class SubmitPuzzleSerializer(serializers.Serializer):
    moves = serializers.ListField(child=serializers.CharField(max_length=10))
    time_seconds = serializers.IntegerField(default=0)
