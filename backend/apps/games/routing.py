from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/game/(?P<game_id>[0-9a-f-]+)/$", consumers.ChessConsumer.as_asgi()),
    re_path(r"ws/matchmaking/$", consumers.MatchmakingConsumer.as_asgi()),
]
