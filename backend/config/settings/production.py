from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403

DEBUG = False
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

ACCOUNT_EMAIL_VERIFICATION = "mandatory"

REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["anon"] = "120/hour"  # noqa: F405
REST_AUTH["JWT_AUTH_SECURE"] = True  # noqa: F405
REST_AUTH["JWT_AUTH_SAMESITE"] = "Strict"  # noqa: F405

WS_ALLOW_QUERY_TOKEN = False
PREMIUM_DEMO_ALLOWED = False
ALLOW_PUBLIC_API_DOCS = False

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

DATABASES["default"]["CONN_MAX_AGE"] = config("DB_CONN_MAX_AGE", default=600, cast=int)  # noqa: F405
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True  # noqa: F405
DATABASES["default"]["OPTIONS"] = {  # noqa: F405
    "connect_timeout": config("POSTGRES_CONNECT_TIMEOUT", default=10, cast=int),
    "sslmode": config("POSTGRES_SSLMODE", default="prefer"),
}
