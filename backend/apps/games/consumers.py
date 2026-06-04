import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth import get_user_model

from .models import Game
from .services import GameService

User = get_user_model()


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope["url_route"]["kwargs"]["game_id"]
        self.room_group_name = f"game_{self.game_id}"
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        is_participant = await self._is_participant()
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        game_data = await self._get_game_state()
        await self.send(text_data=json.dumps({"type": "game_state", "data": game_data}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get("action")

        if action == "move":
            uci = data.get("uci")
            result = await self._make_move(uci)
            if "error" in result:
                await self.send(text_data=json.dumps({"type": "error", "message": result["error"]}))
            else:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {"type": "game_update", "data": result},
                )
        elif action == "resign":
            await self._resign()
        elif action == "chat":
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "game_chat", "user": self.user.username, "message": data.get("message", "")},
            )

    async def game_update(self, event):
        await self.send(text_data=json.dumps({"type": "update", "data": event["data"]}))

    async def game_chat(self, event):
        await self.send(text_data=json.dumps({"type": "chat", "user": event["user"], "message": event["message"]}))

    @database_sync_to_async
    def _is_participant(self):
        try:
            game = Game.objects.get(id=self.game_id)
            return self.user in (game.white_player, game.black_player)
        except Game.DoesNotExist:
            return False

    @database_sync_to_async
    def _get_game_state(self):
        game = Game.objects.get(id=self.game_id)
        return {
            "id": str(game.id),
            "fen": game.fen,
            "status": game.status,
            "white_time_ms": game.white_time_ms,
            "black_time_ms": game.black_time_ms,
            "move_count": game.move_count,
        }

    @database_sync_to_async
    def _make_move(self, uci):
        game = Game.objects.get(id=self.game_id)
        return GameService().make_move(game, self.user, uci)

    @database_sync_to_async
    def _resign(self):
        game = Game.objects.get(id=self.game_id)
        if game.white_player == self.user:
            game.result = Game.Result.BLACK_WIN
            game.winner = game.black_player
        else:
            game.result = Game.Result.WHITE_WIN
            game.winner = game.white_player
        game.status = Game.Status.COMPLETED
        game.save()
