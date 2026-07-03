from decouple import config

from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "backend", "0.0.0.0", "testserver"]

# Fichiers uploadés en local : toujours .media_dev (backend/media est souvent root via Docker).
MEDIA_ROOT = BASE_DIR / ".media_dev"
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
(MEDIA_ROOT / "avatars").mkdir(parents=True, exist_ok=True)

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [  # noqa: F405
    "rest_framework.permissions.IsAuthenticated",
]

# Démo premium désactivée par défaut (activer via PREMIUM_DEMO_ALLOWED=true en local)
PREMIUM_DEMO_ALLOWED = config("PREMIUM_DEMO_ALLOWED", default=False, cast=bool)
ALLOW_PUBLIC_API_DOCS = config("ALLOW_PUBLIC_API_DOCS", default=False, cast=bool)
WS_ALLOW_QUERY_TOKEN = config("WS_ALLOW_QUERY_TOKEN", default=False, cast=bool)

REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["login_burst"] = "10/minute"  # noqa: F405
