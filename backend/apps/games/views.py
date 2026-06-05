from django.db import models
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ratings.models import PlayerRating

from .engine import ChessEngineService
from .models import ChessBot, Game, GameAnalysis
from .serializers import (
    ChessBotSerializer,
    CreateAIGameSerializer,
    GameListSerializer,
    GameSerializer,
    MakeMoveSerializer,
    MatchmakingJoinSerializer,
)
from .elo_adapt import resolve_final_ai_elo
from .elo_config import elo_strength_label, get_user_elo, suggested_ai_elo_for_user
from .game_actions import (
    accept_draw,
    create_rematch,
    decline_draw,
    live_games_queryset,
    offer_draw,
)
from .game_access import can_analyze_game, can_play_game, can_view_game, user_is_participant
from .variant_utils import legal_moves_uci
from .throttling import EngineEvalThrottle
from .services import GameService, MatchmakingService


@extend_schema(summary="Historique des parties du joueur connecté")
class GameListView(generics.ListAPIView):
    serializer_class = GameListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Game.objects.filter(
                models.Q(white_player=user) | models.Q(black_player=user)
            )
            .select_related("white_player", "black_player")
            .distinct()
            .order_by("-ended_at", "-created_at")[:50]
        )


@extend_schema(summary="Détail d'une partie (lecture, replay, spectateur)")
class GameDetailView(generics.RetrieveAPIView):
    serializer_class = GameSerializer
    lookup_field = "id"
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Game.objects.select_related(
            "white_player", "black_player", "winner"
        ).prefetch_related("moves")

    def get_object(self):
        game = super().get_object()
        if not can_view_game(self.request.user, game):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Vous n'avez pas accès à cette partie.")
        return game


@extend_schema(
    summary="Créer une partie contre l'IA",
    request=CreateAIGameSerializer,
    responses={201: GameSerializer},
)
class CreateAIGameView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = CreateAIGameSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vd = ser.validated_data
        bot = None
        bot_slug = (vd.get("bot_slug") or "").strip()
        if bot_slug:
            try:
                bot = ChessBot.objects.get(slug=bot_slug, is_active=True)
            except ChessBot.DoesNotExist:
                return Response({"error": "Bot introuvable."}, status=404)
            if bot.is_premium and not request.user.is_premium:
                return Response(
                    {"error": "Ce bot nécessite un abonnement Gold ou Diamond."},
                    status=403,
                )
        game = GameService().create_ai_game(
            request.user,
            mode=vd["mode"],
            difficulty=vd.get("difficulty"),
            color=vd["color"],
            include_comments=vd.get("include_comments", False),
            ai_elo=vd.get("ai_elo"),
            is_timed=vd.get("is_timed", True),
            time_minutes=vd.get("time_minutes"),
            bot=bot,
            variant=vd.get("variant", Game.Variant.STANDARD),
        )
        return Response(GameSerializer(game).data, status=status.HTTP_201_CREATED)


@extend_schema(
    summary="Prévisualiser la force IA selon le profil",
    parameters=[
        OpenApiParameter(name="mode", type=str, required=False),
        OpenApiParameter(name="difficulty", type=int, required=False),
        OpenApiParameter(name="ai_elo", type=int, required=False),
    ],
)
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
    base_elo = resolve_final_ai_elo(
        request.user, mode=mode, difficulty=diff_int, ai_elo=ai_elo_int, adapt=False
    )
    ai_elo = resolve_final_ai_elo(
        request.user, mode=mode, difficulty=diff_int, ai_elo=ai_elo_int, adapt=True
    )
    suggested_elo = suggested_ai_elo_for_user(request.user, mode)
    return Response({
        "user_elo": user_elo,
        "ai_target_elo": ai_elo,
        "ai_base_elo": base_elo,
        "suggested_ai_elo": suggested_elo,
        "ai_strength_label": elo_strength_label(ai_elo),
        "max_ai_elo": 5000,
        "chess_level": request.user.chess_level,
        "mode": mode,
    })


@extend_schema(summary="Coups légaux (variantes Chess960 / Crazyhouse)")
@api_view(["GET"])
def legal_moves(request, game_id):
    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return Response({"error": "Game not found"}, status=404)
    if not can_view_game(request.user, game):
        return Response({"error": "Forbidden"}, status=403)
    from_sq = request.query_params.get("from")
    moves = legal_moves_uci(game.fen, game.variant)
    if from_sq and len(from_sq) == 2:
        moves = [m for m in moves if m.startswith(from_sq) or m.startswith(from_sq.upper())]
    return Response({"moves": moves, "variant": game.variant})


@extend_schema(
    summary="Jouer un coup (UCI)",
    request=MakeMoveSerializer,
    responses={200: GameSerializer},
)
class MakeMoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        ser = MakeMoveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)
        if not can_play_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)
        if not can_play_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
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


@extend_schema(
    summary="Analyser les coups d'une partie terminée (Stockfish)",
    responses={200: GameSerializer},
)
class AnalyzeGameView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)
        if not can_analyze_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        if game.status != Game.Status.COMPLETED:
            return Response({"error": "Game not completed"}, status=400)
        from .analysis_utils import MAX_ANALYZED_MOVES, compute_accuracies

        move_rows = list(
            game.moves.order_by("move_number").values_list("uci", "played_by_white")
        )[:MAX_ANALYZED_MOVES]
        if not move_rows:
            return Response({"error": "No moves to analyze"}, status=400)
        engine = ChessEngineService()
        evaluations = engine.analyze_game_moves(move_rows)
        if not evaluations:
            return Response(
                {"error": "Analysis failed (engine unavailable or invalid moves)"},
                status=503,
            )
        blunders_w = sum(
            1
            for i, e in enumerate(evaluations)
            if e.classification == "blunder" and move_rows[i][1]
        )
        blunders_b = sum(
            1
            for i, e in enumerate(evaluations)
            if e.classification == "blunder" and not move_rows[i][1]
        )
        acc_w, acc_b = compute_accuracies(evaluations, move_rows)
        analysis, _ = GameAnalysis.objects.update_or_create(
            game=game,
            defaults={
                "accuracy_white": acc_w,
                "accuracy_black": acc_b,
                "blunders_white": blunders_w,
                "blunders_black": blunders_b,
                "best_moves_json": [
                    {
                        "san": e.san,
                        "eval": e.eval_after,
                        "class": e.classification,
                        "cp_loss": e.centipawn_loss,
                        "played_by_white": move_rows[i][1],
                    }
                    for i, e in enumerate(evaluations)
                ],
            },
        )
        return Response(GameSerializer(game).data)


@extend_schema(
    summary="Rejoindre ou quitter la file de matchmaking",
    request=MatchmakingJoinSerializer,
    responses={201: GameSerializer},
)
class MatchmakingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = MatchmakingJoinSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vd = ser.validated_data
        mode = vd["mode"]
        is_timed = vd.get("is_timed", True)
        time_minutes = vd.get("time_minutes")
        rating = PlayerRating.objects.filter(user=request.user, mode=mode).first()
        elo = rating.elo if rating else request.user.initial_elo
        svc = MatchmakingService()
        game = svc.find_match(
            request.user, mode, elo, is_timed=is_timed, time_minutes=time_minutes
        )
        if game:
            return Response(GameSerializer(game).data, status=201)
        svc.join_queue(
            request.user, mode, elo, is_timed=is_timed, time_minutes=time_minutes
        )
        svc.pair_all_waiting()
        return Response({
            "status": "searching",
            "elo": elo,
            "is_timed": is_timed,
            "time_minutes": time_minutes,
        })

    def delete(self, request):
        MatchmakingService().leave_queue(request.user)
        return Response({"status": "left_queue"})


@extend_schema(
    summary="Évaluation Stockfish d'une position FEN",
    parameters=[OpenApiParameter(name="fen", type=str, required=True)],
)
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([EngineEvalThrottle])
def engine_eval(request):
    fen = request.query_params.get("fen")
    if not fen:
        return Response({"error": "fen required"}, status=400)
    eval_score = ChessEngineService().analyze_position(fen)
    return Response({"evaluation": eval_score})


@extend_schema(summary="Catalogue des bots IA")
class BotListView(generics.ListAPIView):
    serializer_class = ChessBotSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = ChessBot.objects.filter(is_active=True)
        premium = self.request.query_params.get("premium")
        if premium == "1":
            qs = qs.filter(is_premium=True)
        elif premium == "0":
            qs = qs.filter(is_premium=False)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(models.Q(name__icontains=q) | models.Q(name_en__icontains=q))
        return qs.order_by("elo", "name")


@extend_schema(summary="Détail d'un bot IA")
class BotDetailView(generics.RetrieveAPIView):
    serializer_class = ChessBotSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    queryset = ChessBot.objects.filter(is_active=True)


class LiveGamesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        games = list(live_games_queryset())
        featured = sorted(
            games,
            key=lambda g: (
                (getattr(g.white_player, "is_african_highlight", False) or False)
                + (getattr(g.black_player, "is_african_highlight", False) or False),
                g.move_count,
            ),
            reverse=True,
        )[:5]
        return Response(
            {
                "channel": "AFRICHESS Live TV",
                "games": GameSerializer(games, many=True).data,
                "featured": GameSerializer(featured, many=True).data,
            }
        )


class DrawOfferView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not can_play_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        result = offer_draw(game, request.user)
        if "error" in result:
            return Response(result, status=400)
        return Response(result)


class DrawRespondView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not can_play_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not user_is_participant(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        new_game = create_rematch(game, request.user)
        if not new_game:
            return Response({"error": "Impossible"}, status=400)
        return Response(GameSerializer(new_game).data, status=201)


class CorrespondenceListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .correspondence import my_correspondence_games

        qs = my_correspondence_games(request.user)
        return Response(GameListSerializer(qs, many=True).data)


class CorrespondenceChallengeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.contrib.auth import get_user_model

        from apps.social.views import _are_friends

        from .correspondence import create_correspondence_game

        User = get_user_model()
        username = request.data.get("username")
        days = int(request.data.get("days_per_move", 3))
        try:
            opponent = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "Joueur introuvable"}, status=404)
        if opponent == request.user:
            return Response({"error": "Impossible"}, status=400)
        if not _are_friends(request.user, opponent):
            return Response({"error": "Vous devez être amis"}, status=400)
        color = request.data.get("color", "white")
        if color == "black":
            white, black = opponent, request.user
        else:
            white, black = request.user, opponent
        game = create_correspondence_game(white, black, days_per_move=days)
        return Response(GameSerializer(game).data, status=201)


@extend_schema(summary="Recherche d'ouverture par ligne de coups")
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def opening_lookup(request):
    from .openings_data import lookup_opening

    raw = request.query_params.get("moves", "")
    locale = (request.query_params.get("lang") or "fr")[:2]
    moves = [m.strip() for m in raw.split(",") if m.strip()] if raw else []
    return Response(lookup_opening(moves, locale=locale))
