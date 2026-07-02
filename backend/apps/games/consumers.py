"""
WebSocket multijoueur temps réel — ChessConsumer + MatchmakingConsumer.
"""

import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.common.ws_connect import accept_websocket
from apps.common.ws_ratelimit import allow_ws_event

from .models import Game
from .realtime_services import build_ws_payload
from .room_utils import ensure_game_room, set_player_connected, try_start_game
from .services import GameService, MatchmakingService

logger = logging.getLogger(__name__)
User = get_user_model()


class ChessConsumer(AsyncWebsocketConsumer):
    """Une salle par partie : ws/game/<game_id>/?token=JWT"""

    async def connect(self):
        self.game_id = self.scope["url_route"]["kwargs"]["game_id"]
        self.room_group_name = f"game_{self.game_id}"
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.is_spectator = False
        if not await self._is_participant():
            if await self._can_spectate():
                self.is_spectator = True
            else:
                await self.close(code=4003)
                return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await accept_websocket(self)
        await self._on_join()

    async def disconnect(self, close_code):
        await self._on_leave()
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        if not allow_ws_event(self.user.id, f"game_{self.game_id}", limit=90):
            await self._send_event("error", {"message": "Trop de messages — ralentissez"})
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self._send_event("error", {"message": "JSON invalide"})
            return

        event = data.get("event") or data.get("action")
        if self.is_spectator:
            await self._send_event("error", {"message": "Mode observateur — lecture seule"})
            return
        if event in ("jouer_coup", "move"):
            await self._handle_move(data)
        elif event in ("proposer_nulle", "offer_draw"):
            await self._handle_draw_offer()
        elif event in ("accepter_nulle", "accept_draw"):
            await self._handle_draw_accept()
        elif event in ("refuser_nulle", "decline_draw"):
            await self._handle_draw_decline()
        elif event in ("annuler_partie", "abort_game"):
            await self._handle_abort()
        elif event in ("demander_reprise", "offer_takeback"):
            await self._handle_takeback_offer()
        elif event in ("accepter_reprise", "accept_takeback"):
            await self._handle_takeback_accept()
        elif event in ("refuser_reprise", "decline_takeback"):
            await self._handle_takeback_decline()
        elif event in ("abandonner_partie", "resign"):
            await self._handle_resign()
        elif event in ("demarrer_partie", "start"):
            await self._handle_start()
        elif event in ("rejoindre_partie", "join"):
            await self._on_join()
        elif event == "chat":
            message = (data.get("message") or "").strip()[:500]
            if not message:
                return
            saved = await self._save_game_chat(message)
            if saved.get("error"):
                await self._send_event("error", saved)
                return
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "relay_chat",
                    "payload": saved,
                },
            )
        else:
            await self._send_event("error", {"message": f"Événement inconnu: {event}"})

    async def _handle_move(self, data):
        uci = data.get("uci") or data.get("coup")
        if not uci:
            await self._send_event("error", {"message": "Coup manquant (uci)"})
            return
        result = await self._make_move(uci, data.get("spent_ms"), data.get("telemetry"))
        if result.get("error"):
            await self._send_event("error", result)
            return
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_move", "payload": result},
        )

    async def _handle_resign(self):
        payload = await self._resign_game()
        if payload.get("error"):
            await self._send_event("error", payload)
            return
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_game_over", "payload": payload},
        )

    async def _handle_start(self):
        payload = await self._start_game()
        if payload:
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "broadcast_started", "payload": payload},
            )

    async def _on_join(self):
        if not getattr(self, "is_spectator", False):
            await self._set_connected(True)
        payload = await self._get_full_state()
        await self._send_event("game_state", payload)
        await self._send_event("rejoindre_partie", {"ok": True, "game_id": self.game_id})

    async def _on_leave(self):
        if (
            getattr(self, "user", None)
            and self.user.is_authenticated
            and not getattr(self, "is_spectator", False)
        ):
            await self._set_connected(False)

    async def broadcast_move(self, event):
        await self._send_event("recevoir_coup", event["payload"])
        if event["payload"].get("game_over"):
            await self._send_event("fin_partie", event["payload"])

    async def broadcast_game_over(self, event):
        await self._send_event("fin_partie", event["payload"])

    async def broadcast_started(self, event):
        await self._send_event("partie_demarree", event["payload"])

    async def relay_chat(self, event):
        await self._send_event("chat", event["payload"])

    async def analysis_ready(self, event):
        await self._send_event("analysis_ready", event["payload"])

    async def broadcast_vote(self, event):
        await self._send_event("vote_updated", event["payload"])

    @database_sync_to_async
    def _save_game_chat(self, content: str) -> dict:
        from apps.social.models import ChatMessage
        from apps.social.serializers import ChatMessageSerializer

        try:
            game = Game.objects.get(id=self.game_id)
        except Game.DoesNotExist:
            return {"error": "Partie introuvable"}
        if self.user.id not in (game.white_player_id, game.black_player_id):
            return {"error": "Chat réservé aux joueurs"}
        if game.is_vs_ai:
            return {"error": "Chat indisponible contre l'IA"}
        msg = ChatMessage.objects.create(
            sender=self.user,
            room_type=ChatMessage.RoomType.GAME,
            room_id=str(self.game_id),
            content=content,
        )
        msg = ChatMessage.objects.select_related("sender").get(pk=msg.pk)
        return ChatMessageSerializer(msg).data

    async def _send_event(self, event: str, data: dict):
        await self.send(text_data=json.dumps({"event": event, "data": data}))

    @database_sync_to_async
    def _is_participant(self):
        try:
            game = Game.objects.get(id=self.game_id)
            return self.user.id in (game.white_player_id, game.black_player_id)
        except Game.DoesNotExist:
            return False

    @database_sync_to_async
    def _can_spectate(self):
        try:
            game = Game.objects.get(id=self.game_id)
            return game.status == Game.Status.ACTIVE and not game.is_vs_ai
        except Game.DoesNotExist:
            return False

    async def _handle_draw_offer(self):
        result = await self._draw_offer()
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_draw", "payload": result},
        )

    async def _handle_draw_accept(self):
        payload = await self._draw_accept()
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_game_over", "payload": payload},
        )

    async def _handle_draw_decline(self):
        await self._draw_decline()
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_draw", "payload": {"declined": True}},
        )

    async def _handle_abort(self):
        payload = await self._abort_game()
        if payload.get("error"):
            await self._send_event("error", payload)
            return
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_game_over", "payload": payload},
        )

    async def _handle_takeback_offer(self):
        result = await self._takeback_offer()
        if result.get("error"):
            await self._send_event("error", result)
            return
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_takeback", "payload": result},
        )

    async def _handle_takeback_accept(self):
        payload = await self._takeback_accept()
        if payload.get("error"):
            await self._send_event("error", payload)
            return
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_takeback", "payload": payload},
        )

    async def _handle_takeback_decline(self):
        await self._takeback_decline()
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_takeback", "payload": {"declined": True}},
        )

    async def broadcast_takeback(self, event):
        await self._send_event("proposition_reprise", event["payload"])

    async def broadcast_draw(self, event):
        await self._send_event("proposition_nulle", event["payload"])

    @database_sync_to_async
    def _draw_offer(self):
        from .game_actions import offer_draw

        game = Game.objects.get(id=self.game_id)
        return offer_draw(game, self.user)

    @database_sync_to_async
    def _draw_accept(self):
        from .game_actions import accept_draw

        game = Game.objects.get(id=self.game_id)
        accept_draw(game, self.user)
        game.refresh_from_db()
        return build_ws_payload(game, {"game_over": True})

    @database_sync_to_async
    def _draw_decline(self):
        from .game_actions import decline_draw

        game = Game.objects.get(id=self.game_id)
        decline_draw(game, self.user)

    @database_sync_to_async
    def _abort_game(self):
        from .game_actions import abort_game

        game = Game.objects.get(id=self.game_id)
        result = abort_game(game, self.user)
        if result.get("error"):
            return result
        game.refresh_from_db()
        return build_ws_payload(game, {"game_over": True})

    @database_sync_to_async
    def _takeback_offer(self):
        from .game_actions import offer_takeback

        game = Game.objects.get(id=self.game_id)
        return offer_takeback(game, self.user)

    @database_sync_to_async
    def _takeback_accept(self):
        from .game_actions import accept_takeback

        game = Game.objects.get(id=self.game_id)
        result = accept_takeback(game, self.user)
        if result.get("error"):
            return result
        game.refresh_from_db()
        return build_ws_payload(game, {"takeback": True})

    @database_sync_to_async
    def _takeback_decline(self):
        from .game_actions import decline_takeback

        game = Game.objects.get(id=self.game_id)
        decline_takeback(game, self.user)

    @database_sync_to_async
    def _set_connected(self, connected: bool):
        try:
            game = Game.objects.get(id=self.game_id)
            set_player_connected(game, self.user, connected)
        except Game.DoesNotExist:
            pass

    @database_sync_to_async
    def _get_full_state(self):
        game = Game.objects.get(id=self.game_id)
        return build_ws_payload(game)

    @database_sync_to_async
    def _make_move(self, uci: str, spent_ms, telemetry=None):
        game = Game.objects.get(id=self.game_id)
        if game.is_vs_ai:
            return {"error": "Parties IA : utilisez l'API REST"}
        result = GameService().make_move(
            game,
            self.user,
            uci,
            spent_ms=spent_ms,
            telemetry=telemetry,
        )
        if "error" in result:
            return result
        game.refresh_from_db()
        last_move = None
        m = game.moves.order_by("-move_number").first()
        if m:
            last_move = {
                "san": m.san,
                "uci": m.uci,
                "from_square": m.from_square,
                "to_square": m.to_square,
                "played_by_white": m.played_by_white,
            }
        return build_ws_payload(
            game,
            {
                "last_move": last_move,
                "game_over": result.get("game_over")
                or game.status == Game.Status.COMPLETED,
            },
        )

    @database_sync_to_async
    def _resign_game(self):
        from .game_actions import resign_game

        game = Game.objects.get(id=self.game_id)
        result = resign_game(game, self.user)
        if result.get("error"):
            return result
        game.refresh_from_db()
        return build_ws_payload(game, {"game_over": True, "reason": "resignation"})

    @database_sync_to_async
    def _start_game(self):
        game = Game.objects.get(id=self.game_id)
        try_start_game(game)
        game.refresh_from_db()
        return build_ws_payload(game)


# Alias rétrocompatibilité
GameConsumer = ChessConsumer


class MatchmakingConsumer(AsyncWebsocketConsumer):
    """File d'attente : ws/matchmaking/?token=JWT"""

    async def connect(self):
        self.user = self.scope.get("user")
        self._leave_queue_on_disconnect = False
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        self.user_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await accept_websocket(self)
        await self.send(
            text_data=json.dumps(
                {"event": "connected", "data": {"user_id": self.user.id}}
            )
        )

    async def disconnect(self, close_code):
        if getattr(self, "user_group", None) and self.user.is_authenticated:
            if getattr(self, "_leave_queue_on_disconnect", False):
                await self._leave_queue()
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
        if not allow_ws_event(self.user.id, "matchmaking", limit=30):
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        event = data.get("event") or data.get("action")
        if event in ("rejoindre_file", "join_queue", "chercher_match"):
            await self._process_matchmaking(
                data.get("mode", "blitz"),
                data.get("is_timed", True),
                data.get("time_minutes"),
                data.get("time_control"),
                data.get("is_rated", True),
                data.get("variant", "standard"),
            )
        elif event in ("quitter_file", "leave_queue"):
            self._leave_queue_on_disconnect = False
            await self._leave_queue()

    async def match_found(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "event": "match_found",
                    "data": {
                        "game_id": event["game_id"],
                        "room_id": event["room_id"],
                        "mode": event.get("mode"),
                    },
                }
            )
        )

    async def _process_matchmaking(
        self,
        mode: str,
        is_timed: bool = True,
        time_minutes=None,
        time_control=None,
        is_rated: bool = True,
        variant: str = "standard",
    ):
        try:
            result, ws_caused_queue = await self._try_match(
                mode, is_timed, time_minutes, time_control, is_rated, variant
            )
        except ValueError as exc:
            await self.send(
                text_data=json.dumps(
                    {"event": "error", "data": {"message": str(exc)}}
                )
            )
            return
        if result is None:
            if ws_caused_queue:
                self._leave_queue_on_disconnect = True
            still_waiting = await self._is_in_queue()
            if still_waiting:
                await self.send(
                    text_data=json.dumps(
                        {
                            "event": "en_attente",
                            "data": {"message": "Recherche adversaire…", "mode": mode},
                        }
                    )
                )
            return
        game_id, room_id, mode, opponent_id = result
        payload = {
            "type": "match_found",
            "game_id": game_id,
            "room_id": room_id,
            "mode": mode,
        }
        await self.channel_layer.group_send(f"user_{self.user.id}", payload)
        if opponent_id:
            await self.channel_layer.group_send(f"user_{opponent_id}", payload)

    @database_sync_to_async
    def _try_match(
        self,
        mode: str,
        is_timed: bool = True,
        time_minutes=None,
        time_control=None,
        is_rated: bool = True,
        variant: str = "standard",
    ):
        from apps.ratings.models import PlayerRating

        rating = PlayerRating.objects.filter(user=self.user, mode=mode).first()
        elo = rating.elo if rating else getattr(self.user, "initial_elo", 1200)
        from .models import MatchmakingQueue

        was_in_queue = MatchmakingQueue.objects.filter(user=self.user).exists()
        svc = MatchmakingService()
        try:
            game = svc.search(
                self.user,
                mode,
                elo,
                is_timed=is_timed,
                time_minutes=time_minutes,
                time_control=time_control,
                is_rated=is_rated,
                variant=variant,
            )
        except ValueError as exc:
            raise exc
        if not game:
            return None, not was_in_queue
        room = ensure_game_room(game)
        opponent_id = (
            game.black_player_id
            if game.white_player_id == self.user.id
            else game.white_player_id
        )
        return (str(game.id), str(room.room_id), mode, opponent_id), False

    @database_sync_to_async
    def _leave_queue(self):
        MatchmakingService().leave_queue(self.user)

    @database_sync_to_async
    def _is_in_queue(self):
        from .models import MatchmakingQueue

        return MatchmakingQueue.objects.filter(user=self.user).exists()
