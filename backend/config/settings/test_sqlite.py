"""Settings temporaires SQLite pour exécuter les tests sans Postgres."""

from .development import *  # noqa: F401, F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Channels / Redis non requis pour les tests unitaires moteur
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}
CELERY_TASK_ALWAYS_EAGER = True
