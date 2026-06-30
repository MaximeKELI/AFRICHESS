from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from apps.ratings.provisional import player_rating_info

from .elo_config import get_user_elo
from .models import ChessBot, Game, GameAnalysis, Move


def _game_rating_mode(game: Game) -> str:
    """Mode de classement pour afficher l'ELO (les parties IA stockent mode=ai)."""
    if game.mode != Game.Mode.AI:
        return game.mode
    tcm = game.time_control_minutes
    if tcm is not None and tcm <= 3:
        return "bullet"
    if tcm is not None and tcm >= 15:
        return "rapid"
    return "blitz"


def _ai_side_elo(game: Game) -> int:
    if game.bot_id and game.bot:
        return game.bot.elo
    return game.ai_target_elo


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
        fields = [
            "accuracy_white", "accuracy_black",
            "move_accuracy_white", "move_accuracy_black",
            "blunders_white", "blunders_black",
            "best_moves_json", "summary_fr", "summary_en", "key_moments_json",
        ]


class ChessBotSerializer(serializers.ModelSerializer):
    is_legend = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = ChessBot
        fields = [
            "slug",
            "name",
            "name_en",
            "country",
            "elo",
            "avatar_id",
            "avatar_url",
            "personality",
            "opening_style",
            "description",
            "description_en",
            "is_premium",
            "is_legend",
            "games_played",
        ]

    def get_is_legend(self, obj: ChessBot) -> bool:
        return obj.elo >= 2400

    def get_avatar_url(self, obj: ChessBot) -> str:
        from django.conf import settings

        base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        return f"{base}/avatars/bots/{obj.avatar_id}.png"


class GameSerializer(serializers.ModelSerializer):
    white_player = UserPublicSerializer(read_only=True)
    black_player = UserPublicSerializer(read_only=True)
    moves = MoveSerializer(many=True, read_only=True)
    analysis = GameAnalysisSerializer(read_only=True)
    bot = ChessBotSerializer(read_only=True)
    white_elo = serializers.SerializerMethodField()
    black_elo = serializers.SerializerMethodField()
    white_elo_provisional = serializers.SerializerMethodField()
    black_elo_provisional = serializers.SerializerMethodField()

    def get_white_elo(self, obj: Game):
        if obj.white_player_id:
            return player_rating_info(obj.white_player, _game_rating_mode(obj))["elo"]
        if obj.is_vs_ai:
            return _ai_side_elo(obj)
        return None

    def get_black_elo(self, obj: Game):
        if obj.black_player_id:
            return player_rating_info(obj.black_player, _game_rating_mode(obj))["elo"]
        if obj.is_vs_ai:
            return _ai_side_elo(obj)
        return None

    def get_white_elo_provisional(self, obj: Game) -> bool:
        if not obj.white_player_id:
            return False
        return player_rating_info(obj.white_player, _game_rating_mode(obj))["is_provisional"]

    def get_black_elo_provisional(self, obj: Game) -> bool:
        if not obj.black_player_id:
            return False
        return player_rating_info(obj.black_player, _game_rating_mode(obj))["is_provisional"]

    class Meta:
        model = Game
        fields = [
            "id", "white_player", "black_player", "status", "mode", "variant",
            "chess960_position_id", "bot", "result",
            "fen", "pgn", "move_count", "white_time_ms", "black_time_ms",
            "increment_ms",
            "is_timed", "time_control_minutes", "is_rated",
            "is_vs_ai", "ai_difficulty", "ai_target_elo",
            "white_elo", "black_elo",
            "white_elo_provisional", "black_elo_provisional",
            "moves", "analysis",
            "termination_reason",
            "created_at", "started_at", "ended_at",
            "days_per_move", "turn_deadline",
            "draw_offered_by", "takeback_requested_by", "conditional_moves",
        ]


def serialize_game_move_delta(game: Game, result: dict) -> dict:
    """Réponse légère après un coup : FEN + nouveaux coups uniquement."""
    new_moves = []
    player_move = result.get("move")
    if player_move is not None:
        new_moves.append(MoveSerializer(player_move).data)
    ai_record = result.get("ai_move_record")
    if ai_record is not None:
        new_moves.append(MoveSerializer(ai_record).data)

    payload: dict = {
        "id": str(game.id),
        "fen": game.fen,
        "status": game.status,
        "result": game.result or "",
        "termination_reason": getattr(game, "termination_reason", "") or "",
        "move_count": game.move_count,
        "white_time_ms": game.white_time_ms,
        "black_time_ms": game.black_time_ms,
        "increment_ms": game.increment_ms,
        "new_moves": new_moves,
        "delta": True,
        "game_over": bool(result.get("game_over")),
    }
    if result.get("comments_pending"):
        payload["comments_pending"] = True
    if result.get("draw_claim"):
        payload["draw_claim"] = result["draw_claim"]
    if result.get("result"):
        payload["result"] = result["result"]
    if result.get("termination_reason"):
        payload["termination_reason"] = result["termination_reason"]
    return payload


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
            "days_per_move",
            "turn_deadline",
        ]


class CreateAIGameSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(
        choices=["bullet", "blitz", "rapid", "classical"],
        default="blitz",
    )
    difficulty = serializers.IntegerField(min_value=1, max_value=20, required=False)
    ai_elo = serializers.IntegerField(min_value=100, max_value=5000, required=False)
    bot_slug = serializers.SlugField(required=False, allow_blank=True)
    variant = serializers.ChoiceField(
        choices=["standard", "chess960", "crazyhouse", "kingofthehill", "threecheck"],
        default="standard",
        required=False,
    )
    color = serializers.ChoiceField(choices=["white", "black"], default="white")
    include_comments = serializers.BooleanField(default=False, required=False)
    is_timed = serializers.BooleanField(default=True, required=False)
    time_minutes = serializers.IntegerField(required=False, allow_null=True)
    time_control = serializers.CharField(required=False, allow_blank=True)

    def validate_time_control(self, value):
        if not value:
            return value
        from .time_control import ALLOWED_TIME_CONTROLS

        key = value.strip()
        if key not in ALLOWED_TIME_CONTROLS:
            raise serializers.ValidationError(
                f"Cadence inconnue. Valeurs : {', '.join(ALLOWED_TIME_CONTROLS)}."
            )
        return key

    def validate_time_minutes(self, value):
        if value is None:
            return value
        from .time_control import ALLOWED_TIME_MINUTES

        if value not in ALLOWED_TIME_MINUTES:
            raise serializers.ValidationError(
                "Durée autorisée : 5, 10, 15, 20, 25 ou 30 minutes."
            )
        return value

    def validate_mode(self, value):
        if value == "classical":
            return "rapid"
        return value


class MatchmakingJoinSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(
        choices=["bullet", "blitz", "rapid", "classical"],
        default="blitz",
    )
    variant = serializers.ChoiceField(
        choices=["standard", "chess960", "crazyhouse", "kingofthehill", "threecheck"],
        default="standard",
        required=False,
    )
    is_timed = serializers.BooleanField(default=True, required=False)
    is_rated = serializers.BooleanField(default=True, required=False)
    time_minutes = serializers.IntegerField(required=False, allow_null=True)
    time_control = serializers.CharField(required=False, allow_blank=True)

    def validate_time_control(self, value):
        if not value:
            return value
        from .time_control import ALLOWED_TIME_CONTROLS

        key = value.strip()
        if key not in ALLOWED_TIME_CONTROLS:
            raise serializers.ValidationError(
                f"Cadence inconnue. Valeurs : {', '.join(ALLOWED_TIME_CONTROLS)}."
            )
        return key

    def validate_time_minutes(self, value):
        if value is None:
            return value
        from .time_control import ALLOWED_TIME_MINUTES

        if value not in ALLOWED_TIME_MINUTES:
            raise serializers.ValidationError(
                "Durée autorisée : 5, 10, 15, 20, 25 ou 30 minutes."
            )
        return value


class FairPlayTelemetrySerializer(serializers.Serializer):
    tab_blur = serializers.IntegerField(min_value=0, max_value=4, required=False)
    focus_loss_ms = serializers.IntegerField(min_value=0, max_value=120_000, required=False)
    window_switch = serializers.IntegerField(min_value=0, max_value=6, required=False)
    copy_paste = serializers.IntegerField(min_value=0, max_value=3, required=False)
    devtools = serializers.IntegerField(min_value=0, max_value=2, required=False)
    mouse_entropy = serializers.FloatField(min_value=0, max_value=1.0, required=False)
    premove = serializers.IntegerField(min_value=0, max_value=20, required=False)


class MakeMoveSerializer(serializers.Serializer):
    uci = serializers.CharField(max_length=10)
    include_comments = serializers.BooleanField(default=False, required=False)
    spent_ms = serializers.IntegerField(min_value=0, required=False)
    telemetry = FairPlayTelemetrySerializer(required=False)
