"""Compteurs connexions WebSocket actives (tier WS)."""

from channels.middleware import BaseMiddleware

from .metrics import record_ws_close, record_ws_open


class WsMetricsMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        if scope.get("type") != "websocket":
            return await super().__call__(scope, receive, send)
        record_ws_open()
        try:
            return await super().__call__(scope, receive, send)
        finally:
            record_ws_close()
