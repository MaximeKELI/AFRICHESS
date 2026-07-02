import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("africhess")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Métriques Prometheus (durée tâches par queue)
import apps.common.celery_metrics  # noqa: E402, F401
