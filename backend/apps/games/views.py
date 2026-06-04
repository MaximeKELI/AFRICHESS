from django.db import models
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ratings.models import PlayerRating

from .engine import ChessEngineService
from .models import Game, GameAnalysis
from .serializers import CreateAIGameSerializer, GameListSerializer, GameSerializer, MakeMoveSerializer
from .elo_adapt import adapt_ai_elo_from_history
from .elo_config import elo_strength_label, get_user_elo, resolve_ai_target_elo
from .game_actions import (
    accept_draw,
    create_rematch,
    decline_draw,
    live_games_queryset,
    offer_draw,
)
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
        vd = ser.validated_data
        game = GameService().create_ai_game(
            request.user,
            mode=vd["mode"],
            difficulty=vd.get("difficulty"),
            color=vd["color"],
            include_comments=vd.get("include_comments", False),
            ai_elo=vd.get("ai_elo"),
        )
        return Response(GameSerializer(game).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def ai_strength_preview(request):
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    """Prévisualise l'ELO IA selon le profil et le curseur."""
    mode = request.query_params.get("mode", "blitz")
    difficulty = request.query_params.get("difficulty")
    ai_elo_param = request.query_params.get("ai_elo")
    diff_int = int(difficulty) if difficulty and difficulty.isdigit() else None
    ai_elo_int = int(ai_elo_param) if ai_elo_param and ai_elo_param.isdigit() else None
    user_elo = get_user_elo(request.user, mode)
    base_elo = resolve_ai_target_elo(
        request.user, mode=mode, difficulty=diff_int, ai_elo=ai_elo_int
    )
    ai_elo = adapt_ai_elo_from_history(request.user, base_elo, mode=mode)
    return Response({
        "user_elo": user_elo,
        "ai_target_elo": ai_elo,
        "ai_base_elo": base_elo,
        "ai_strength_label": elo_strength_label(ai_elo),
        "max_ai_elo": 5000,
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
        result = GameService().make_move(
            game,
            request.user,
            ser.validated_data["uci"],
            include_comments=ser.validated_data.get("include_comments", False),
            spent_ms=ser.validated_data.get("spent_ms"),
        )
        if "error" in result:
            return Response(result, status=400)
        game.refresh_from_db()
        return Response(GameSerializer(game).data)


class UndoMoveView(APIView):
    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)
        result = GameService().undo_moves(game, request.user)
        if "error" in result:
            return Response(result, status=400)
        game.refresh_from_db()
        return Response(GameSerializer(game).data)


@api_view(["GET"])
def active_games(request):
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    games = Game.objects.filter(
        status=Game.Status.ACTIVE,
    ).filter(
        models.Q(white_player=request.user) | models.Q(black_player=request.user)
    )[:5]
    return Response(GameSerializer(games, many=True).data)


class AnalyzeGameView(APIView):
    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)
        pgn = game.pgn
        if not pgn and game.moves.exists():
            parts = []
            for m in game.moves.order_by("move_number"):
                parts.append(m.san)
            pgn = " ".join(parts)
        if not pgn:
            return Response({"error": "No moves to analyze"}, status=400)
        engine = ChessEngineService()
        evaluations = engine.analyze_game(pgn)
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
        elo = rating.elo if rating else request.user.initial_elo
        svc = MatchmakingService()
        game = svc.find_match(request.user, mode, elo)
        if game:
            return Response(GameSerializer(game).data, status=201)
        svc.join_queue(request.user, mode, elo)
        svc.pair_all_waiting()
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


class LiveGamesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        games = live_games_queryset()
        return Response(GameSerializer(games, many=True).data)


class DrawOfferView(APIView):
    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        result = offer_draw(game, request.user)
        if "error" in result:
            return Response(result, status=400)
        return Response(result)


class DrawRespondView(APIView):
    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        accept = request.data.get("accept", False)
        if accept:
            result = accept_draw(game, request.user)
        else:
            result = decline_draw(game, request.user)
        if "error" in result:
            return Response(result, status=400)
        game.refresh_from_db()
        return Response(GameSerializer(game).data)


class RematchView(APIView):
    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        new_game = create_rematch(game, request.user)
        if not new_game:
            return Response({"error": "Impossible"}, status=400)
        return Response(GameSerializer(new_game).data, status=201)
