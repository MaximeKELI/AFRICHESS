"""
WebSocket multijoueur temps réel — ChessConsumer + MatchmakingConsumer.
"""

import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone

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
        await self.accept()
        await self._on_join()

    async def disconnect(self, close_code):
        await self._on_leave()
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
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
        elif event in ("abandonner_partie", "resign"):
            await self._handle_resign()
        elif event in ("demarrer_partie", "start"):
            await self._handle_start()
        elif event in ("rejoindre_partie", "join"):
            await self._on_join()
        elif event == "chat":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "relay_chat",
                    "user": self.user.username,
                    "message": data.get("message", ""),
                },
            )
        else:
            await self._send_event("error", {"message": f"Événement inconnu: {event}"})

    async def _handle_move(self, data):
        uci = data.get("uci") or data.get("coup")
        if not uci:
            await self._send_event("error", {"message": "Coup manquant (uci)"})
            return
        result = await self._make_move(uci, data.get("spent_ms"))
        if result.get("error"):
            await self._send_event("error", result)
            return
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "broadcast_move", "payload": result},
        )

    async def _handle_resign(self):
        payload = await self._resign_game()
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
        await self._send_event("chat", {"user": event["user"], "message": event["message"]})

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
    def _make_move(self, uci: str, spent_ms):
        game = Game.objects.get(id=self.game_id)
        if game.is_vs_ai:
            return {"error": "Parties IA : utilisez l'API REST"}
        result = GameService().make_move(game, self.user, uci, spent_ms=spent_ms)
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
        game = Game.objects.get(id=self.game_id)
        if game.status == Game.Status.ACTIVE:
            if game.white_player_id == self.user.id:
                game.result = Game.Result.BLACK_WIN
                game.winner = game.black_player
            else:
                game.result = Game.Result.WHITE_WIN
                game.winner = game.white_player
            game.status = Game.Status.COMPLETED
            game.ended_at = timezone.now()
            game.termination_reason = "resignation"
            game.save()
            if game.white_player and game.black_player:
                GameService().rating_service.update_ratings(game)
            from .stats_service import on_game_completed

            on_game_completed(game)
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
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        self.user_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()
        await self.send(
            text_data=json.dumps(
                {"event": "connected", "data": {"user_id": self.user.id}}
            )
        )

    async def disconnect(self, close_code):
        await self._leave_queue()
        await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def receive(self, text_data):
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
            )

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
        self, mode: str, is_timed: bool = True, time_minutes=None
    ):
        result = await self._try_match(mode, is_timed, time_minutes)
        if result is None:
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
    def _try_match(self, mode: str, is_timed: bool = True, time_minutes=None):
        from apps.ratings.models import PlayerRating

        rating = PlayerRating.objects.filter(user=self.user, mode=mode).first()
        elo = rating.elo if rating else getattr(self.user, "initial_elo", 1200)
        svc = MatchmakingService()
        game = svc.find_match(
            self.user, mode, elo, is_timed=is_timed, time_minutes=time_minutes
        )
        if not game:
            svc.join_queue(
                self.user, mode, elo, is_timed=is_timed, time_minutes=time_minutes
            )
            return None
        room = ensure_game_room(game)
        opponent_id = (
            game.black_player_id
            if game.white_player_id == self.user.id
            else game.white_player_id
        )
        return str(game.id), str(room.room_id), mode, opponent_id

    @database_sync_to_async
    def _leave_queue(self):
        MatchmakingService().leave_queue(self.user)
