from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ratings.models import PlayerRating

from .engine import ChessEngineService
from .models import Game, GameAnalysis
from .serializers import CreateAIGameSerializer, GameListSerializer, GameSerializer, MakeMoveSerializer
from .elo_config import get_user_elo, resolve_ai_target_elo
from .services import GameService, MatchmakingService


class GameListView(generics.ListAPIView):
    serializer_class = GameListSerializer

    def get_queryset(self):
        user = self.request.user
        return Game.objects.filter(
            models.Q(white_player=user) | models.Q(black_player=user)
        ).distinct()[:50]


class GameDetailView(generics.RetrieveAPIView):
    serializer_class = GameSerializer
    lookup_field = "id"
    queryset = Game.objects.all()


class CreateAIGameView(APIView):
    def post(self, request):
        ser = CreateAIGameSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        game = GameService().create_ai_game(
            request.user,
            mode=ser.validated_data["mode"],
            difficulty=ser.validated_data["difficulty"],
            color=ser.validated_data["color"],
        )
        return Response(GameSerializer(game).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def ai_strength_preview(request):
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    """Prévisualise l'ELO IA selon le profil et le curseur."""
    mode = request.query_params.get("mode", "blitz")
    difficulty = request.query_params.get("difficulty")
    diff_int = int(difficulty) if difficulty and difficulty.isdigit() else None
    user_elo = get_user_elo(request.user, mode)
    ai_elo = resolve_ai_target_elo(request.user, mode=mode, difficulty=diff_int)
    return Response({
        "user_elo": user_elo,
        "ai_target_elo": ai_elo,
        "chess_level": request.user.chess_level,
        "mode": mode,
    })


class MakeMoveView(APIView):
    def post(self, request, game_id):
        ser = MakeMoveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)
        result = GameService().make_move(game, request.user, ser.validated_data["uci"])
        if "error" in result:
            return Response(result, status=400)
        game.refresh_from_db()
        return Response(GameSerializer(game).data)


class AnalyzeGameView(APIView):
    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)
        if not game.pgn:
            return Response({"error": "No moves to analyze"}, status=400)
        engine = ChessEngineService()
        evaluations = engine.analyze_game(game.pgn)
        blunders_w = sum(1 for e in evaluations if e.classification == "blunder" and e.move_number % 2 == 1)
        blunders_b = sum(1 for e in evaluations if e.classification == "blunder" and e.move_number % 2 == 0)
        analysis, _ = GameAnalysis.objects.update_or_create(
            game=game,
            defaults={
                "blunders_white": blunders_w,
                "blunders_black": blunders_b,
                "best_moves_json": [
                    {"san": e.san, "eval": e.eval_after, "class": e.classification}
                    for e in evaluations
                ],
            },
        )
        return Response(GameSerializer(game).data)


class MatchmakingView(APIView):
    def post(self, request):
        mode = request.data.get("mode", "blitz")
        rating = PlayerRating.objects.filter(user=request.user, mode=mode).first()
        elo = rating.elo if rating else 1200
        svc = MatchmakingService()
        game = svc.find_match(request.user, mode, elo)
        if game:
            return Response(GameSerializer(game).data, status=201)
        svc.join_queue(request.user, mode, elo)
        return Response({"status": "searching", "elo": elo})

    def delete(self, request):
        MatchmakingService().leave_queue(request.user)
        return Response({"status": "left_queue"})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def engine_eval(request):
    fen = request.query_params.get("fen")
    if not fen:
        return Response({"error": "fen required"}, status=400)
    eval_score = ChessEngineService().analyze_position(fen)
    return Response({"evaluation": eval_score})
