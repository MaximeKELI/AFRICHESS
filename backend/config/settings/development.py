from decouple import config

from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "backend", "0.0.0.0", "testserver"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [  # noqa: F405
    "rest_framework.permissions.IsAuthenticated",
]

# Démo premium + docs uniquement si explicitement activé en local
PREMIUM_DEMO_ALLOWED = config("PREMIUM_DEMO_ALLOWED", default=True, cast=bool)
ALLOW_PUBLIC_API_DOCS = config("ALLOW_PUBLIC_API_DOCS", default=False, cast=bool)
WS_ALLOW_QUERY_TOKEN = config("WS_ALLOW_QUERY_TOKEN", default=False, cast=bool)

# Inscription / connexion : limite plus souple en local (évite blocage après tests)
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["auth"] = "200/hour"  # noqa: F405
