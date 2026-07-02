"""Route les lectures vers les réplicas Postgres (production)."""

from django.conf import settings


class ReadReplicaRouter:
    def db_for_read(self, model, **hints):
        if getattr(settings, "USE_READ_REPLICA", False) and "replica" in settings.DATABASES:
            return "replica"
        return "default"

    def db_for_write(self, model, **hints):
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return db == "default"
