"""Métriques Prometheus — API, WS, matchmaking, Celery, DB."""

from __future__ import annotations

import time
from contextlib import contextmanager

from django.conf import settings
from prometheus_client import Counter, Gauge, Histogram, generate_latest

# --- HTTP API ---
HTTP_REQUESTS = Counter(
    "africhess_http_requests_total",
    "Requêtes HTTP par méthode, route et code.",
    ["method", "view", "status"],
)
HTTP_LATENCY = Histogram(
    "africhess_http_request_duration_seconds",
    "Latence des requêtes HTTP.",
    ["method", "view"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# --- WebSocket ---
WS_CONNECTIONS_TOTAL = Counter(
    "africhess_ws_connections_total",
    "Connexions WebSocket ouvertes (cumul).",
    ["tier"],
)
WS_CONNECTIONS_ACTIVE = Gauge(
    "africhess_ws_connections_active",
    "Connexions WebSocket actives.",
    ["tier"],
)
WS_MESSAGES = Counter(
    "africhess_ws_messages_total",
    "Messages WebSocket reçus.",
    ["consumer"],
)

# --- Matchmaking ---
MM_LATENCY = Histogram(
    "africhess_matchmaking_latency_seconds",
    "Latence Redis match_or_enqueue.",
    ["status"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)
MM_QUEUE_SIZE = Gauge(
    "africhess_matchmaking_queue_size",
    "Joueurs en attente (Redis).",
)
MM_SHADOW_QUEUE_SIZE = Gauge(
    "africhess_matchmaking_shadow_queue_size",
    "Joueurs en attente dans les pools shadow (AIE).",
)

# --- Fair Play / AIE ---
FAIRPLAY_SHADOW_POOL_USERS = Gauge(
    "africhess_fairplay_shadow_pool_users",
    "Profils intégrité en shadow pool.",
)
FAIRPLAY_PENDING_CASES = Gauge(
    "africhess_fairplay_pending_cases",
    "Cas de revue fair play en attente.",
)
FAIRPLAY_FLAGGED_24H = Gauge(
    "africhess_fairplay_flagged_reports_24h",
    "Rapports SUSPICIOUS/LIKELY_CHEAT sur 24 h.",
)
FAIRPLAY_AUTO_SANCTIONS = Counter(
    "africhess_fairplay_auto_sanctions_total",
    "Sanctions auto (shadow log ou appliquées).",
    ["mode", "decision"],
)
FAIRPLAY_ANALYSES = Counter(
    "africhess_fairplay_analyses_total",
    "Analyses fair play C++ terminées.",
    ["verdict"],
)

# --- Celery (complété par redis_exporter côté infra) ---
CELERY_TASKS = Counter(
    "africhess_celery_tasks_total",
    "Tâches Celery terminées.",
    ["queue", "task", "status"],
)
CELERY_TASK_DURATION = Histogram(
    "africhess_celery_task_duration_seconds",
    "Durée des tâches Celery.",
    ["queue", "task"],
    buckets=(0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600),
)

# --- Base de données ---
DB_QUERY_DURATION = Histogram(
    "africhess_db_query_duration_seconds",
    "Durée des requêtes DB (middleware).",
    ["alias"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5),
)


def metrics_enabled() -> bool:
    return getattr(settings, "PROMETHEUS_METRICS_ENABLED", True)


def ws_tier() -> str:
    return getattr(settings, "AFRICHESS_TIER", "all")


def record_ws_open() -> None:
    if not metrics_enabled():
        return
    tier = ws_tier()
    WS_CONNECTIONS_TOTAL.labels(tier=tier).inc()
    WS_CONNECTIONS_ACTIVE.labels(tier=tier).inc()


def record_ws_close() -> None:
    if not metrics_enabled():
        return
    WS_CONNECTIONS_ACTIVE.labels(tier=ws_tier()).dec()


def record_ws_message(consumer: str) -> None:
    if metrics_enabled():
        WS_MESSAGES.labels(consumer=consumer).inc()


def record_matchmaking(status: str, duration_s: float) -> None:
    if not metrics_enabled():
        return
    MM_LATENCY.labels(status=status).observe(duration_s)


def set_matchmaking_queue_size(count: int) -> None:
    if metrics_enabled():
        MM_QUEUE_SIZE.set(count)


def set_matchmaking_shadow_queue_size(count: int) -> None:
    if metrics_enabled():
        MM_SHADOW_QUEUE_SIZE.set(count)


def set_fairplay_scale_metrics(
    *,
    shadow_users: int,
    pending_cases: int,
    shadow_queue: int,
    flagged_24h: int,
) -> None:
    if not metrics_enabled():
        return
    FAIRPLAY_SHADOW_POOL_USERS.set(shadow_users)
    FAIRPLAY_PENDING_CASES.set(pending_cases)
    FAIRPLAY_FLAGGED_24H.set(flagged_24h)
    set_matchmaking_shadow_queue_size(shadow_queue)


def record_fairplay_auto_sanction(*, shadow: bool, decision: str) -> None:
    if metrics_enabled():
        FAIRPLAY_AUTO_SANCTIONS.labels(
            mode="shadow" if shadow else "applied",
            decision=decision or "none",
        ).inc()


def record_fairplay_analysis(verdict: str) -> None:
    if metrics_enabled():
        FAIRPLAY_ANALYSES.labels(verdict=verdict or "unknown").inc()


def record_celery_task(queue: str, task: str, status: str, duration_s: float) -> None:
    if not metrics_enabled():
        return
    CELERY_TASKS.labels(queue=queue, task=task, status=status).inc()
    CELERY_TASK_DURATION.labels(queue=queue, task=task).observe(duration_s)


@contextmanager
def observe_db(alias: str = "default"):
    if not metrics_enabled():
        yield
        return
    start = time.perf_counter()
    try:
        yield
    finally:
        DB_QUERY_DURATION.labels(alias=alias).observe(time.perf_counter() - start)


def prometheus_metrics_body() -> bytes:
    return generate_latest()
