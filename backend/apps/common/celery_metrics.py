"""Instrumentation Celery — durée et statut par queue."""

from celery import signals

from .metrics import record_celery_task


@signals.task_prerun.connect
def _task_prerun(sender=None, task_id=None, task=None, **kwargs):
    if task is not None:
        task.request._metrics_start = __import__("time").perf_counter()  # noqa: SLF001


@signals.task_postrun.connect
def _task_postrun(sender=None, task_id=None, task=None, state=None, **kwargs):
    if task is None:
        return
    start = getattr(task.request, "_metrics_start", None)
    if start is None:
        return
    duration = __import__("time").perf_counter() - start
    queue = getattr(task.request, "delivery_info", {}) or {}
    queue_name = queue.get("routing_key") or getattr(task, "queue", "default")
    status = "success" if state == "SUCCESS" else state or "unknown"
    record_celery_task(queue_name, task.name or "unknown", status, duration)
