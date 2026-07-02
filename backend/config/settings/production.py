from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403

DEBUG = False
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = config("USE_X_FORWARDED_HOST", default=True, cast=bool)
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

CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="", cast=Csv())  # noqa: F405
if not CSRF_TRUSTED_ORIGINS:  # noqa: F405
    CSRF_TRUSTED_ORIGINS = [  # noqa: F405
        origin
        for origin in CORS_ALLOWED_ORIGINS  # noqa: F405
        if origin.startswith("https://")
    ]

# --- Email (verification obligatoire en prod) ---
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@africhess.com")
SERVER_EMAIL = config("SERVER_EMAIL", default=DEFAULT_FROM_EMAIL)

if not EMAIL_HOST:
    raise ImproperlyConfigured(
        "EMAIL_HOST must be set in production (ACCOUNT_EMAIL_VERIFICATION=mandatory)."
    )

# --- Postgres via PgBouncer (écritures) + réplica lecture ---
_pgbouncer_host = config("PGBOUNCER_HOST", default="")
_db_host = _pgbouncer_host or config("POSTGRES_HOST", default="localhost")  # noqa: F405
_db_port = config("PGBOUNCER_PORT", default=config("POSTGRES_PORT", default="5432"))  # noqa: F405

DATABASES["default"]["HOST"] = _db_host  # noqa: F405
DATABASES["default"]["PORT"] = _db_port  # noqa: F405
DATABASES["default"]["CONN_MAX_AGE"] = config("DB_CONN_MAX_AGE", default=0, cast=int)  # noqa: F405
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True  # noqa: F405
DATABASES["default"]["OPTIONS"] = {  # noqa: F405
    "connect_timeout": config("POSTGRES_CONNECT_TIMEOUT", default=10, cast=int),
    "sslmode": config("POSTGRES_SSLMODE", default="prefer"),
}

_replica_host = config("POSTGRES_REPLICA_HOST", default="")
if _replica_host:
    DATABASES["replica"] = {  # noqa: F405
        **DATABASES["default"],  # noqa: F405
        "HOST": _replica_host,
        "PORT": config("POSTGRES_REPLICA_PORT", default=_db_port),
    }
    DATABASE_ROUTERS = ["config.db_router.ReadReplicaRouter"]  # noqa: F405
    USE_READ_REPLICA = config("USE_READ_REPLICA", default=True, cast=bool)  # noqa: F405

# --- Redis production (cluster / URLs dédiées) ---
if REDIS_CHANNELS_URLS:  # noqa: F405
    CHANNEL_LAYERS["default"]["CONFIG"]["hosts"] = REDIS_CHANNELS_URLS  # noqa: F405

if REDIS_CELERY_URL:  # noqa: F405
    CELERY_BROKER_URL = REDIS_CELERY_URL  # noqa: F405
    CELERY_RESULT_BACKEND = REDIS_CELERY_URL  # noqa: F405

# Observabilité
PROMETHEUS_METRICS_ENABLED = config("PROMETHEUS_METRICS_ENABLED", default=True, cast=bool)
