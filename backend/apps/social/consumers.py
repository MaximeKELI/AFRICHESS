import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from apps.common.text_validation import CHAT_MESSAGE_MAX, validate_user_text
from apps.common.ws_connect import accept_websocket
from apps.common.ws_ratelimit import allow_ws_event
from rest_framework.exceptions import ValidationError

from .chat_access import user_can_send_chat_message, user_can_view_chat_room
from .models import ChatMessage


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_type = self.scope["url_route"]["kwargs"]["room_type"]
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group = f"chat_{self.room_type}_{self.room_id}"
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        allowed = await database_sync_to_async(user_can_view_chat_room)(
            self.user, self.room_type, self.room_id
        )
        if not allowed:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await accept_websocket(self)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        if not allow_ws_event(self.user.id, f"chat_{self.room_type}_{self.room_id}", limit=30):
            return
        can_send = await database_sync_to_async(user_can_send_chat_message)(
            self.user, self.room_type, self.room_id
        )
        if not can_send:
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        try:
            message = validate_user_text(
                data.get("message") or "",
                max_len=CHAT_MESSAGE_MAX,
                field="message",
            )
        except ValidationError:
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
