from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "backend", "0.0.0.0"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [  # noqa: F405
    "rest_framework.permissions.IsAuthenticated",
]
