from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403

DEBUG = False
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

_INSECURE_SECRET_KEYS = {
    "dev-only-change-in-production-use-32-chars-min",
    "dev-secret-change-in-production-32b",
    "dev-local-docker-compose-secret-key-minimum-fifty-characters-long",
    "your-super-secret-key-change-me",
    "ci-secret-key-32-bytes-minimum!!",
}

if len(SECRET_KEY) < 50 or SECRET_KEY in _INSECURE_SECRET_KEYS:  # noqa: F405
    raise ImproperlyConfigured(
        "SECRET_KEY must be a unique random string of at least 50 characters in production."
    )
