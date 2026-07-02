"""Endpoint /metrics pour Prometheus (sans auth, réseau interne uniquement)."""

from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden

from .metrics import prometheus_metrics_body


def prometheus_metrics(_request):
    if not getattr(settings, "PROMETHEUS_METRICS_ENABLED", True):
        return HttpResponseForbidden("metrics disabled")
    return HttpResponse(
        prometheus_metrics_body(),
        content_type="text/plain; version=0.0.4; charset=utf-8",
    )
