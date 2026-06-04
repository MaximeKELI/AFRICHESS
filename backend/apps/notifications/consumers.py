import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import Notification
from .serializers import NotificationSerializer


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        self.group = f"user_{self.user.id}_notifications"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        items = await self._recent()
        await self.send(
            text_data=json.dumps({"event": "notifications", "data": items})
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group, self.channel_name)

    async def notify_push(self, event):
        await self.send(
            text_data=json.dumps(
                {"event": "new_notification", "data": event["notification"]}
            )
        )

    @database_sync_to_async
    def _recent(self):
        qs = Notification.objects.filter(user=self.user)[:20]
        return NotificationSerializer(qs, many=True).data
