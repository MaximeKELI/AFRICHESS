import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import ChatMessage


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_type = self.scope["url_route"]["kwargs"]["room_type"]
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group = f"chat_{self.room_type}_{self.room_id}"
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get("message", "").strip()[:500]
        if not message:
            return
        await self._save_message(message)
        await self.channel_layer.group_send(
            self.room_group,
            {
                "type": "chat_message",
                "username": self.user.username,
                "message": message,
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            "user": event["username"],
            "message": event["message"],
        }))

    @database_sync_to_async
    def _save_message(self, content):
        ChatMessage.objects.create(
            sender=self.user,
            room_type=self.room_type,
            room_id=self.room_id,
            content=content,
        )
