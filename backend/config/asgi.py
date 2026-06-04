import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

django_asgi_app = get_asgi_application()

from apps.games.middleware import JwtAuthMiddlewareStack  # noqa: E402
from apps.games.routing import websocket_urlpatterns  # noqa: E402
from apps.notifications.routing import (  # noqa: E402
    websocket_urlpatterns as notifications_ws,
)
from apps.social.routing import social_websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JwtAuthMiddlewareStack(
            URLRouter(
                websocket_urlpatterns
                + social_websocket_urlpatterns
                + notifications_ws
            )
        ),
    }
)
