from decouple import config

from .base import *  # noqa: F401, F403
import os

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "backend", "0.0.0.0", "testserver"]

# Media local : repli si backend/media n'est pas inscriptible (ex. créé par Docker en root).
_media_default = BASE_DIR / "media"
_media_fallback = BASE_DIR / ".media_dev"
try:
    _media_default.mkdir(parents=True, exist_ok=True)
    (_media_default / "avatars").mkdir(parents=True, exist_ok=True)
    if not os.access(_media_default, os.W_OK):
        raise PermissionError(str(_media_default))
    MEDIA_ROOT = _media_default
except OSError:
    _media_fallback.mkdir(parents=True, exist_ok=True)
    (_media_fallback / "avatars").mkdir(parents=True, exist_ok=True)
    MEDIA_ROOT = _media_fallback

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [  # noqa: F405
    "rest_framework.permissions.IsAuthenticated",
]

# Démo premium désactivée par défaut (activer via PREMIUM_DEMO_ALLOWED=true en local)
PREMIUM_DEMO_ALLOWED = config("PREMIUM_DEMO_ALLOWED", default=False, cast=bool)
ALLOW_PUBLIC_API_DOCS = config("ALLOW_PUBLIC_API_DOCS", default=False, cast=bool)
WS_ALLOW_QUERY_TOKEN = config("WS_ALLOW_QUERY_TOKEN", default=False, cast=bool)

REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["login_burst"] = "10/minute"  # noqa: F405
