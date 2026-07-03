from django.db import models
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ratings.models import PlayerRating

from .engine import ChessEngineService
from .models import ChessBot, Game, GameAnalysis, AnalysisJob
from .serializers import (
    ChessBotSerializer,
    CreateAIGameSerializer,
    GameAnalysisSerializer,
    GameListSerializer,
    GameSerializer,
    MakeMoveSerializer,
    MatchmakingJoinSerializer,
    serialize_game_move_delta,
)
from .elo_adapt import resolve_final_ai_elo
from .elo_config import elo_strength_label, get_user_elo, suggested_ai_elo_for_user
from .game_actions import (
    abort_game,
    accept_draw,
    accept_takeback,
    clear_conditional_moves,
    create_rematch,
    decline_draw,
    decline_takeback,
    live_games_queryset,
    offer_draw,
    offer_takeback,
    resign_game,
    set_conditional_move,
)
from .game_access import can_analyze_game, can_play_game, can_view_game, user_is_participant
from .variant_utils import legal_moves_uci, parse_pockets
from apps.common.throttles import AnalyzeThrottle

from .throttling import EngineEvalThrottle
from .services import GameService, MatchmakingService
from .tts import synthesize_wav


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
            "white_player", "black_player", "winner", "bot"
        ).prefetch_related("moves")

    def get_object(self):
        game = super().get_object()
        if not can_view_game(self.request.user, game):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Vous n'avez pas accès à cette partie.")
        self._rating_context_game = game
        return game

    def get_serializer_context(self):
        from apps.ratings.batch import batch_player_ratings

        context = super().get_serializer_context()
        game = getattr(self, "_rating_context_game", None)
        if game is not None:
            context["rating_map"] = batch_player_ratings([game])
        return context


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
            time_control=vd.get("time_control"),
            bot=bot,
            variant=vd.get("variant", Game.Variant.STANDARD),
        )
        from apps.ratings.batch import batch_player_ratings

        data = GameSerializer(
            game,
            context={"rating_map": batch_player_ratings([game])},
        ).data
        if getattr(game, "comments_pending", False):
            data["comments_pending"] = True
        return Response(data, status=status.HTTP_201_CREATED)


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


@extend_schema(
    summary="Synthèse vocale (secours Linux — espeak-ng)",
    parameters=[OpenApiParameter(name="text", type=str, required=True)],
)
@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
def speech_tts(request):
    if request.method == "POST":
        text = request.data.get("text", "") if isinstance(request.data, dict) else ""
    else:
        text = request.query_params.get("text", "")
    wav = synthesize_wav(text)
    if not wav:
        return Response(
            {"error": "Synthèse vocale indisponible (espeak-ng manquant sur le serveur)."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    from django.http import HttpResponse

    return HttpResponse(wav, content_type="audio/wav")


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
    payload: dict = {"moves": moves, "variant": game.variant}
    if game.variant == "crazyhouse":
        payload["pockets"] = parse_pockets(game.fen)
    return Response(payload)


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
            telemetry=ser.validated_data.get("telemetry"),
        )
        if "error" in result:
            return Response(result, status=400)
        game.refresh_from_db()
        from .ws_notify import notify_move_made

        notify_move_made(game, result)
        data = serialize_game_move_delta(game, result)
        return Response(data)


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
    throttle_classes = [AnalyzeThrottle]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)
        if not can_analyze_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        if game.status != Game.Status.COMPLETED:
            return Response({"error": "Game not completed"}, status=400)
        from apps.users.premium_utils import analysis_engine_depth, max_analysis_moves

        from .game_analysis_service import build_and_save_game_analysis

        limit = max_analysis_moves(request.user)
        depth = analysis_engine_depth(request.user)
        analysis = build_and_save_game_analysis(game, depth=depth, move_limit=limit)
        if not analysis:
            return Response({"error": "No moves to analyze"}, status=400)
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
        variant = vd.get("variant", "standard")
        is_timed = vd.get("is_timed", True)
        is_rated = vd.get("is_rated", True)
        time_minutes = vd.get("time_minutes")
        time_control = vd.get("time_control")
        rating = PlayerRating.objects.filter(user=request.user, mode=mode).first()
        elo = rating.elo if rating else request.user.initial_elo
        svc = MatchmakingService()
        try:
            game = svc.search(
                request.user,
                mode,
                elo,
                is_timed=is_timed,
                time_minutes=time_minutes,
                time_control=time_control,
                is_rated=is_rated,
                variant=variant,
            )
        except ValueError as exc:
            return Response({"error": str(exc), "code": "fairplay_sanction"}, status=403)
        if game:
            return Response(GameSerializer(game).data, status=201)
        return Response({
            "status": "searching",
            "elo": elo,
            "is_timed": is_timed,
            "time_minutes": time_minutes,
            "searching_players": svc.searching_count(),
        })

    def delete(self, request):
        MatchmakingService().leave_queue(request.user)
        return Response({"status": "left_queue"})


@extend_schema(summary="Joueurs en recherche de partie (matchmaking)")
class MatchmakingStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.core.cache import cache

        from . import matchmaking_redis as mmr
        from .matchmaking_pools import pool_stats, retry_all_waiting_pools

        if mmr.is_redis_matchmaking_available():
            retry_all_waiting_pools()
        MatchmakingService().pair_all_waiting()

        cached = cache.get("mm:status")
        if cached is not None:
            return Response(cached)

        svc = MatchmakingService()
        stats = pool_stats()
        payload = {
            "searching_players": svc.searching_count(),
            "redis_enabled": mmr.is_redis_matchmaking_available(),
            "pools": stats,
        }
        cache.set("mm:status", payload, 3)
        return Response(payload)


@extend_schema(summary="Défier un joueur (ami ou non)")
class ChallengeUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.contrib.auth import get_user_model

        from apps.notifications.models import Notification
        from apps.social.relationships import is_blocked

        from .odds import fen_for_odds

        User = get_user_model()
        username = (request.data.get("username") or "").strip()
        if not username:
            return Response({"error": "username required"}, status=400)
        try:
            opponent = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "Joueur introuvable"}, status=404)
        if opponent == request.user:
            return Response({"error": "Impossible"}, status=400)
        if is_blocked(request.user, opponent):
            return Response({"error": "Action non autorisée"}, status=403)

        mode = request.data.get("mode", "blitz")
        odds = request.data.get("odds", "none")
        is_rated = bool(request.data.get("is_rated", True))
        time_control = request.data.get("time_control")
        is_timed = request.data.get("is_timed", True)

        if is_rated:
            svc = MatchmakingService()
            try:
                svc._check_fairplay(request.user, True)
            except ValueError as exc:
                return Response({"error": str(exc), "code": "fairplay_sanction"}, status=403)

        starting_fen = fen_for_odds(odds)
        game = GameService().create_friend_game(
            request.user,
            opponent,
            mode=mode,
            is_rated=is_rated,
            is_timed=bool(is_timed),
            time_control=time_control,
            starting_fen=starting_fen,
            odds_preset=odds if odds and odds != "none" else "",
        )
        Notification.objects.create(
            user=opponent,
            type=Notification.Type.GAME_INVITE,
            title=f"{request.user.display_name or request.user.username} vous défie",
            body=f"Partie {mode} — rejoignez la partie",
            data={
                "game_id": str(game.id),
                "mode": mode,
                "from_username": request.user.username,
            },
        )
        return Response(GameSerializer(game).data, status=status.HTTP_201_CREATED)


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
        legends = self.request.query_params.get("legends")
        if legends == "1":
            qs = qs.filter(elo__gte=2400)
        return qs.order_by("-elo", "name")


@extend_schema(summary="Détail d'un bot IA")
class BotDetailView(generics.RetrieveAPIView):
    serializer_class = ChessBotSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    queryset = ChessBot.objects.filter(is_active=True)


class LiveGamesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .live_tv import batch_player_elos, build_tv_payload
        from .serializers import LiveGameSerializer

        games = list(live_games_queryset()[:50])
        elo_ctx = {"elo_map": batch_player_elos(games)}
        tv = build_tv_payload("best", games=games)
        featured_ids = set(tv.get("queue_game_ids") or [])
        featured = [g for g in games[:30] if str(g.id) in featured_ids][:5]
        if not featured:
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
                "games": LiveGameSerializer(games[:30], many=True, context=elo_ctx).data,
                "featured": LiveGameSerializer(featured, many=True, context=elo_ctx).data,
                "tv": tv,
            }
        )


class LiveTvView(APIView):
    """Canal TV avec rotation temporelle (style Lichess TV)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .live_tv import TV_CHANNELS, batch_player_elos, build_tv_payload
        from .serializers import LiveGameSerializer

        channel = request.query_params.get("channel", "best")
        games = list(live_games_queryset()[:50])
        payload = build_tv_payload(channel, games=games)
        current_id = payload.get("current_game_id")
        by_id = {str(g.id): g for g in games}
        elo_ctx = {"elo_map": batch_player_elos(games)}
        current = by_id.get(current_id) if current_id else None
        queue = [by_id[g_id] for g_id in payload.get("queue_game_ids", []) if g_id in by_id]
        payload["channels"] = list(TV_CHANNELS)
        payload["current"] = (
            LiveGameSerializer(current, context=elo_ctx).data if current else None
        )
        payload["queue"] = LiveGameSerializer(queue, many=True, context=elo_ctx).data
        return Response(payload)


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
        from .ws_notify import notify_game_room

        notify_game_room(game.id, "broadcast_draw", result)
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
            if "error" in result:
                return Response(result, status=400)
            game.refresh_from_db()
            from .realtime_services import build_ws_payload
            from .ws_notify import notify_game_room

            notify_game_room(game.id, "broadcast_game_over", build_ws_payload(game, {"game_over": True}))
            return Response(GameSerializer(game).data)
        result = decline_draw(game, request.user)
        if "error" in result:
            return Response(result, status=400)
        from .ws_notify import notify_game_room

        notify_game_room(game.id, "broadcast_draw", {"declined": True})
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


class AbortGameView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not can_play_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        result = abort_game(game, request.user)
        if "error" in result:
            return Response(result, status=400)
        game.refresh_from_db()
        from .realtime_services import build_ws_payload
        from .ws_notify import notify_game_room

        notify_game_room(
            game.id,
            "broadcast_game_over",
            build_ws_payload(game, {"game_over": True, "reason": "aborted"}),
        )
        return Response(GameSerializer(game).data)


class ResignGameView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not can_play_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        result = resign_game(game, request.user)
        if "error" in result:
            return Response(result, status=400)
        game.refresh_from_db()
        from .realtime_services import build_ws_payload
        from .ws_notify import notify_game_room

        notify_game_room(game.id, "broadcast_game_over", build_ws_payload(game, {"game_over": True, "reason": "resignation"}))
        return Response(GameSerializer(game).data)


class TakebackOfferView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not can_play_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        result = offer_takeback(game, request.user)
        if "error" in result:
            return Response(result, status=400)
        from .ws_notify import notify_game_room

        notify_game_room(game.id, "broadcast_takeback", result)
        return Response(result)


class TakebackRespondView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not can_play_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        accept = request.data.get("accept", False)
        from .ws_notify import notify_game_room

        if accept:
            result = accept_takeback(game, request.user)
            if "error" in result:
                return Response(result, status=400)
            game.refresh_from_db()
            from .realtime_services import build_ws_payload

            notify_game_room(game.id, "broadcast_takeback", build_ws_payload(game, {"takeback": True}))
            return Response(GameSerializer(game).data)
        result = decline_takeback(game, request.user)
        if "error" in result:
            return Response(result, status=400)
        notify_game_room(game.id, "broadcast_takeback", {"declined": True})
        game.refresh_from_db()
        return Response(GameSerializer(game).data)


class ConditionalMoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not can_play_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        if request.data.get("clear"):
            result = clear_conditional_moves(game, request.user)
        else:
            result = set_conditional_move(
                game,
                request.user,
                request.data.get("trigger_uci", ""),
                request.data.get("response_uci", ""),
            )
        if "error" in result:
            return Response(result, status=400)
        game.refresh_from_db()
        return Response(GameSerializer(game).data)


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


class CorrespondenceSeekView(APIView):
    """Rejoindre le pool ouvert daily chess."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .correspondence import CorrespondenceMatchmakingService

        days = int(request.data.get("days_per_move", 3))
        svc = CorrespondenceMatchmakingService()
        game = svc.join_queue(request.user, days_per_move=days)
        if game:
            return Response(GameSerializer(game).data, status=201)
        return Response({"status": "searching", "days_per_move": days})

    def delete(self, request):
        from .correspondence import CorrespondenceMatchmakingService

        CorrespondenceMatchmakingService().leave_queue(request.user)
        return Response({"status": "left_queue"})


@extend_schema(summary="Recherche d'ouverture par ligne de coups")
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def opening_lookup(request):
    from .openings_data import lookup_opening

    raw = request.query_params.get("moves", "")
    locale = (request.query_params.get("lang") or "fr")[:2]
    moves = [m.strip() for m in raw.split(",") if m.strip()] if raw else []
    return Response(lookup_opening(moves, locale=locale))


@extend_schema(summary="Opening Explorer Lichess (proxy API publique)")
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def lichess_opening_explorer(request):
    from .lichess_explorer import fetch_opening_explorer, normalize_explorer_moves

    fen = request.query_params.get("fen")
    if not fen:
        return Response({"error": "fen required"}, status=400)
    source = request.query_params.get("source", "lichess")
    ratings_raw = request.query_params.get("ratings", "")
    ratings = [int(x) for x in ratings_raw.split(",") if x.strip().isdigit()] or None
    data = fetch_opening_explorer(fen, source=source, ratings=ratings)
    if data is None:
        return Response({"available": False, "moves": []})
    return Response(
        {
            "available": True,
            "source": source,
            "white": data.get("white"),
            "draws": data.get("draws"),
            "black": data.get("black"),
            "opening": data.get("opening"),
            "moves": normalize_explorer_moves(data),
            "topGames": data.get("topGames") or [],
        }
    )


@extend_schema(summary="Probe tablebase Syzygy (≤7 pièces, API Lichess)")
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def tablebase_probe(request):
    from .tablebase import probe_tablebase

    fen = request.query_params.get("fen")
    if not fen:
        return Response({"error": "fen required"}, status=400)
    result = probe_tablebase(fen)
    if result is None:
        return Response({"available": False})
    return Response({"available": True, **result})


class AnalyzeGameAsyncView(APIView):
    """Lance une analyse cloud asynchrone (Celery)."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AnalyzeThrottle]

    def post(self, request, game_id):
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            return Response({"error": "Game not found"}, status=404)
        if not can_analyze_game(request.user, game):
            return Response({"error": "Forbidden"}, status=403)
        if game.status != Game.Status.COMPLETED:
            return Response({"error": "Game not completed"}, status=400)

        from apps.users.premium_utils import analysis_engine_depth

        depth = min(analysis_engine_depth(request.user) + 4, 22)
        job = AnalysisJob.objects.create(game=game, user=request.user, depth=depth)
        from .analysis_async import schedule_analyze_game

        schedule_analyze_game(str(game.id), job.id)
        return Response({"job_id": job.id, "status": job.status, "depth": depth}, status=202)


class AnalyzeGameStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, game_id):
        job = (
            AnalysisJob.objects.filter(game_id=game_id, user=request.user)
            .order_by("-created_at")
            .first()
        )
        if not job:
            return Response({"status": "none"})
        payload = {"job_id": job.id, "status": job.status, "depth": job.depth}
        if job.status == AnalysisJob.Status.COMPLETED:
            try:
                analysis = GameAnalysis.objects.get(game_id=game_id)
                payload["analysis"] = GameAnalysisSerializer(
                    analysis, context={"request": request}
                ).data
            except GameAnalysis.DoesNotExist:
                pass
        if job.status == AnalysisJob.Status.FAILED:
            payload["error"] = job.error
        return Response(payload)

