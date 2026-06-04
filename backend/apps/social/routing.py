from django.urls import re_path

from . import consumers

social_websocket_urlpatterns = [
    re_path(
        r"ws/chat/(?P<room_type>\w+)/(?P<room_id>[\w-]+)/$",
        consumers.ChatConsumer.as_asgi(),
    ),
]
