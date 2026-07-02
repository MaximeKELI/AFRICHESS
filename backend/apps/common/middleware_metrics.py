"""Middleware HTTP — latence et compteurs Prometheus."""

import time

from django.utils.deprecation import MiddlewareMixin

from .metrics import HTTP_LATENCY, HTTP_REQUESTS, metrics_enabled


class PrometheusMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, _view_args, _view_kwargs):
        if not metrics_enabled():
            return None
        name = getattr(view_func, "__name__", "unknown")
        cls = getattr(view_func, "cls", None)
        if cls is not None:
            name = cls.__name__
        request._prom_view = name  # noqa: SLF001
        return None

    def process_response(self, request, response):
        if not metrics_enabled():
            return response
        view = getattr(request, "_prom_view", "unknown")
        method = request.method
        status = str(response.status_code)
        HTTP_REQUESTS.labels(method=method, view=view, status=status).inc()
        started = getattr(request, "_prom_start", None)
        if started is not None:
            HTTP_LATENCY.labels(method=method, view=view).observe(
                time.perf_counter() - started
            )
        return response

    def process_request(self, request):
        if metrics_enabled():
            request._prom_start = time.perf_counter()  # noqa: SLF001
        return None
