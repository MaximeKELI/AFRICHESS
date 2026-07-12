"""
AFRICHESS — Base Django settings
Developer: Maxime Dzidula KELI
"""
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config(
    "SECRET_KEY",
    default="dev-only-change-in-production-use-32-chars-min",
)
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third party
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "channels",
    "drf_spectacular",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.github",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    # AFRICHESS apps
    "apps.users",
    "apps.games",
    "apps.ratings",
    "apps.puzzles",
    "apps.social",
    "apps.tournaments",
    "apps.notifications",
    "apps.learning",
    "apps.analytics",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.gzip.GZipMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "apps.common.middleware_metrics.PrometheusMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"
SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")
GOOGLE_OAUTH_CLIENT_ID = config("GOOGLE_OAUTH_CLIENT_ID", default="")
GOOGLE_OAUTH_CLIENT_SECRET = config("GOOGLE_OAUTH_CLIENT_SECRET", default="")
GITHUB_OAUTH_CLIENT_ID = config("GITHUB_OAUTH_CLIENT_ID", default="")
GITHUB_OAUTH_CLIENT_SECRET = config("GITHUB_OAUTH_CLIENT_SECRET", default="")

SOCIALACCOUNT_ADAPTER = "apps.users.adapters.AfrichessSocialAccountAdapter"
SOCIALACCOUNT_LOGIN_ON_GET = False
ACCOUNT_LOGOUT_ON_GET = False

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("POSTGRES_DB", default="africhess"),
        "USER": config("POSTGRES_USER", default="africhess"),
        "PASSWORD": config("POSTGRES_PASSWORD", default="africhess"),
        "HOST": config("POSTGRES_HOST", default="localhost"),
        "PORT": config("POSTGRES_PORT", default="5432"),
    }
}

# Tier déploiement : api | ws | worker | beat | all (dev)
AFRICHESS_TIER = config("AFRICHESS_TIER", default="all")

# Redis / Channels
REDIS_URL = config(
    "REDIS_URL",
    default="redis://:africhess_redis_dev@localhost:6379/0",
)
# Cluster / URLs dédiées (production) — CSV pour plusieurs nœuds Channels
REDIS_CHANNELS_URLS = config("REDIS_CHANNELS_URLS", default="", cast=Csv())
REDIS_CELERY_URL = config("REDIS_CELERY_URL", default="")
REDIS_MATCHMAKING_URL = config("REDIS_MATCHMAKING_URL", default="")
REDIS_CACHE_URL = config(
    "REDIS_CACHE_URL",
    default="redis://:africhess_redis_dev@localhost:6379/4",
)

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_CACHE_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "africhess",
        "TIMEOUT": 300,
    }
}

WS_ALLOW_QUERY_TOKEN = config("WS_ALLOW_QUERY_TOKEN", default=False, cast=bool)
ALLOW_PUBLIC_API_DOCS = config("ALLOW_PUBLIC_API_DOCS", default=False, cast=bool)
PREMIUM_DEMO_ALLOWED = config("PREMIUM_DEMO_ALLOWED", default=False, cast=bool)

_channel_redis_hosts = REDIS_CHANNELS_URLS if REDIS_CHANNELS_URLS else [REDIS_URL]
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": _channel_redis_hosts},
    }
}

_celery_redis = REDIS_CELERY_URL or REDIS_URL
CELERY_BROKER_URL = _celery_redis
CELERY_RESULT_BACKEND = _celery_redis
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_TASK_DEFAULT_QUEUE = "default"
CELERY_TASK_QUEUES = {
    "default": {"exchange": "default", "routing_key": "default"},
    "realtime": {"exchange": "realtime", "routing_key": "realtime"},
    "analysis": {"exchange": "analysis", "routing_key": "analysis"},
    "fairplay": {"exchange": "fairplay", "routing_key": "fairplay"},
}
CELERY_TASK_ROUTES = {
    "apps.games.tasks.retry_matchmaking_pools": {"queue": "realtime"},
    "apps.games.tasks.pair_matchmaking_queues": {"queue": "realtime"},
    "apps.games.tasks.forfeit_disconnected_games": {"queue": "realtime"},
    "apps.games.tasks.flag_expired_clocks": {"queue": "realtime"},
    "apps.games.tasks.pair_correspondence_queues": {"queue": "realtime"},
    "apps.games.tasks.forfeit_overdue_correspondence_games": {"queue": "realtime"},
    "apps.tournaments.tasks.auto_start_due_tournaments": {"queue": "realtime"},
    "apps.tournaments.tasks.complete_expired_arenas": {"queue": "realtime"},

    "apps.games.tasks.auto_analyze_completed_game": {"queue": "analysis"},
    "apps.games.tasks.analyze_game_async": {"queue": "analysis"},
    "apps.games.tasks.generate_move_comments_async": {"queue": "analysis"},
    "apps.games.tasks.analyze_fairplay_async": {"queue": "fairplay"},
    "apps.games.tasks.expire_fairplay_sanctions_task": {"queue": "fairplay"},
    "apps.users.tasks.expire_premium_subscriptions": {"queue": "default"},
    "notifications.send_native_push": {"queue": "default"},
}

# Observabilité
PROMETHEUS_METRICS_ENABLED = config("PROMETHEUS_METRICS_ENABLED", default=True, cast=bool)
USE_READ_REPLICA = config("USE_READ_REPLICA", default=False, cast=bool)
USE_GLICKO2 = config("USE_GLICKO2", default=True, cast=bool)
LICHESS_EXPLORER_URL = config("LICHESS_EXPLORER_URL", default="https://explorer.lichess.ovh")
LICHESS_EXPLORER_CACHE_SECONDS = config("LICHESS_EXPLORER_CACHE_SECONDS", default=3600, cast=int)
LIVE_TV_ROTATION_SECONDS = config("LIVE_TV_ROTATION_SECONDS", default=30, cast=int)

# CORS
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.users.authentication.AfrichessJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "300/hour",
        "user": "5000/hour",
        "engine_eval": "120/hour",
        "auth": "20/hour",
        "login_burst": "10/minute",
        "analyze": "30/hour",
        "chat": "60/minute",
    },
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.common.exceptions.africhess_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "AFRICHESS API",
    "DESCRIPTION": "Global chess platform — REST API",
    "VERSION": "1.0.0",
    "CONTACT": {"name": "Maxime Dzidula KELI", "email": "contact@africhess.com"},
}

# dj-rest-auth / allauth
JWT_REFRESH_HTTPONLY = config("JWT_REFRESH_HTTPONLY", default=False, cast=bool)
REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_HTTPONLY": JWT_REFRESH_HTTPONLY,
    "JWT_AUTH_COOKIE": "access_token",
    "JWT_AUTH_REFRESH_COOKIE": "refresh_token",
    "JWT_AUTH_SAMESITE": "Lax",
    "JWT_AUTH_SECURE": not DEBUG,
    "LOGIN_SERIALIZER": "apps.users.auth_serializers.AfrichessLoginSerializer",
    "USER_DETAILS_SERIALIZER": "apps.users.auth_serializers.AfrichessUserDetailsSerializer",
    "OLD_PASSWORD_FIELD_ENABLED": True,
    "LOGOUT_ON_PASSWORD_CHANGE": True,
}
ACCOUNT_LOGIN_METHODS = {"email", "username"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "username*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "optional"

# Chess engine
STOCKFISH_PATH = config("STOCKFISH_PATH", default="/usr/games/stockfish")
ENGINE_DEPTH = config("ENGINE_DEPTH", default=18, cast=int)
FAIRPLAY_BIN = config("FAIRPLAY_BIN", default="/usr/local/bin/africhess-fairplay")
FAIRPLAY_EXEMPT_USERNAMES = config("FAIRPLAY_EXEMPT_USERNAMES", default="Maxime_KELI", cast=Csv())
FAIRPLAY_DEPTH = config("FAIRPLAY_DEPTH", default=14, cast=int)
FAIRPLAY_TIMEOUT = config("FAIRPLAY_TIMEOUT", default=120, cast=int)
FAIRPLAY_AUTO_SANCTIONS_ENABLED = config("FAIRPLAY_AUTO_SANCTIONS_ENABLED", default=False, cast=bool)
FAIRPLAY_AUTO_SANCTIONS_SHADOW = config("FAIRPLAY_AUTO_SANCTIONS_SHADOW", default=True, cast=bool)
FAIRPLAY_AUTO_MIN_BASELINE_GAMES = config("FAIRPLAY_AUTO_MIN_BASELINE_GAMES", default=10, cast=int)
FAIRPLAY_AUTO_PEER_DELTA_MIN = config("FAIRPLAY_AUTO_PEER_DELTA_MIN", default=20.0, cast=float)
FAIRPLAY_AUTO_ENGINE_TOP1_MIN = config("FAIRPLAY_AUTO_ENGINE_TOP1_MIN", default=0.65, cast=float)
FAIRPLAY_AUTO_WARN_STRIKES = config("FAIRPLAY_AUTO_WARN_STRIKES", default=2, cast=int)
FAIRPLAY_AUTO_MM_BLOCK_DAYS = config("FAIRPLAY_AUTO_MM_BLOCK_DAYS", default=7, cast=int)
FAIRPLAY_CLOCK_DRIFT_MS = config("FAIRPLAY_CLOCK_DRIFT_MS", default=2500, cast=int)
FAIRPLAY_CLOCK_DRIFT_BLOCK_MS = config(
    "FAIRPLAY_CLOCK_DRIFT_BLOCK_MS", default=12000, cast=int
)
FAIRPLAY_SHADOW_TRUST_MAX = config("FAIRPLAY_SHADOW_TRUST_MAX", default=55.0, cast=float)
FAIRPLAY_SHADOW_FUSION_MIN = config("FAIRPLAY_SHADOW_FUSION_MIN", default=30.0, cast=float)
FAIRPLAY_AUTO_FUSION_SANCTION_MIN = config(
    "FAIRPLAY_AUTO_FUSION_SANCTION_MIN", default=35.0, cast=float
)
FAIRPLAY_SHADOW_BATCH_SIZE = config("FAIRPLAY_SHADOW_BATCH_SIZE", default=500, cast=int)

# ELO defaults
DEFAULT_ELO = 1200
K_FACTOR_BLITZ = 32
K_FACTOR_RAPID = 24
K_FACTOR_BULLET = 40

# Matchmaking
MATCHMAKING_ELO_RANGE = config("MATCHMAKING_ELO_RANGE", default=200, cast=int)
MATCHMAKING_REDIS_ENABLED = config("MATCHMAKING_REDIS_ENABLED", default=True, cast=bool)
MATCHMAKING_REDIS_PREFIX = config("MATCHMAKING_REDIS_PREFIX", default="mm:pool")
# Élargissement auto désactivé côté code ; max aligné sur ELO_RANGE (200).
MATCHMAKING_POOL_EXPAND_SECONDS = config("MATCHMAKING_POOL_EXPAND_SECONDS", default=3, cast=int)
MATCHMAKING_POOL_EXPAND_STEP = config("MATCHMAKING_POOL_EXPAND_STEP", default=50, cast=int)
MATCHMAKING_POOL_MAX_RANGE = config("MATCHMAKING_POOL_MAX_RANGE", default=200, cast=int)

CELERY_BEAT_SCHEDULE = {
    "retry-matchmaking-pools": {
        "task": "apps.games.tasks.retry_matchmaking_pools",
        "schedule": 2.0,
    },
    "pair-matchmaking": {
        "task": "apps.games.tasks.pair_matchmaking_queues",
        "schedule": 5.0,
    },
    "forfeit-disconnected": {
        "task": "apps.games.tasks.forfeit_disconnected_games",
        "schedule": 30.0,
    },
    "flag-expired-clocks": {
        "task": "apps.games.tasks.flag_expired_clocks",
        "schedule": 2.0,
    },
    "auto-start-tournaments": {
        "task": "apps.tournaments.tasks.auto_start_due_tournaments",
        "schedule": 30.0,
    },
    "complete-expired-arenas": {
        "task": "apps.tournaments.tasks.complete_expired_arenas",
        "schedule": 30.0,
    },
    "forfeit-correspondence": {
        "task": "apps.games.tasks.forfeit_overdue_correspondence_games",
        "schedule": 900.0,
    },
    "pair-correspondence": {
        "task": "apps.games.tasks.pair_correspondence_queues",
        "schedule": 120.0,
    },
    "expire-premium": {
        "task": "apps.users.tasks.expire_premium_subscriptions",
        "schedule": 3600.0,
    },
    "expire-fairplay-sanctions": {
        "task": "apps.games.tasks.expire_fairplay_sanctions_task",
        "schedule": 3600.0,
    },
    "refresh-fairplay-metrics": {
        "task": "apps.games.tasks.refresh_fairplay_scale_metrics",
        "schedule": 60.0,
    },
    "batch-sync-shadow-pools": {
        "task": "apps.games.tasks.batch_sync_shadow_pools_task",
        "schedule": 300.0,
    },
    "tick-tv-exhibitions": {
        "task": "apps.games.tasks.tick_tv_exhibition_games",
        "schedule": 8.0,
    },
}

DISCONNECT_FORFEIT_SECONDS = config("DISCONNECT_FORFEIT_SECONDS", default=90, cast=int)

# Low-bandwidth mode threshold (KB/s hint from client)
LOW_BANDWIDTH_THRESHOLD = 500

# Push notifications (Expo → APNs/FCM, Web Push VAPID)
PUSH_NOTIFICATIONS_ENABLED = config("PUSH_NOTIFICATIONS_ENABLED", default=True, cast=bool)
EXPO_ACCESS_TOKEN = config("EXPO_ACCESS_TOKEN", default="")
VAPID_PUBLIC_KEY = config("VAPID_PUBLIC_KEY", default="")
VAPID_PRIVATE_KEY = config("VAPID_PRIVATE_KEY", default="")
VAPID_CONTACT = config("VAPID_CONTACT", default="mailto:admin@africhess.com")

# Analyse post-partie automatique (Stockfish en arrière-plan)
AUTO_GAME_ANALYSIS_ENABLED = config("AUTO_GAME_ANALYSIS_ENABLED", default=True, cast=bool)
AUTO_GAME_ANALYSIS_MIN_MOVES = config("AUTO_GAME_ANALYSIS_MIN_MOVES", default=2, cast=int)
AUTO_GAME_ANALYSIS_MOVETIME_MS = config("AUTO_GAME_ANALYSIS_MOVETIME_MS", default=80, cast=int)
