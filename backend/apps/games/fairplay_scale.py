"""Fair Play à l'échelle — shadow pools AIE, métriques ops, sync batch."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db.models import Avg, Count, Q
from django.utils import timezone

from .fairplay_exempt import user_is_fairplay_exempt
from .models import (
    FairPlayIntegrityProfile,
    FairPlayReport,
    FairPlayReviewCase,
    MatchmakingQueue,
)

logger = logging.getLogger(__name__)


def _shadow_trust_max() -> float:
    return float(getattr(settings, "FAIRPLAY_SHADOW_TRUST_MAX", 55.0))


def _shadow_fusion_min() -> float:
    return float(getattr(settings, "FAIRPLAY_SHADOW_FUSION_MIN", 30.0))


def collect_fairplay_scale_stats() -> dict[str, Any]:
    """Agrégats pour ops / Grafana / admin overview."""
    from . import matchmaking_redis as mmr
    from .matchmaking_pools import pool_stats

    shadow_users = FairPlayIntegrityProfile.objects.filter(shadow_pool=True).count()
    tracked = FairPlayIntegrityProfile.objects.count()
    avg_trust = (
        FairPlayIntegrityProfile.objects.aggregate(v=Avg("trust_score")).get("v") or 0
    )
    pending_cases = FairPlayReviewCase.objects.filter(
        status=FairPlayReviewCase.Status.PENDING
    ).count()
    auto_pending = FairPlayReviewCase.objects.filter(
        status=FairPlayReviewCase.Status.PENDING,
        auto_recommended_decision__isnull=False,
    ).count()
    since_24h = timezone.now() - timedelta(hours=24)
    flagged_24h = FairPlayReport.objects.filter(
        verdict__in=(
            FairPlayReport.Verdict.SUSPICIOUS,
            FairPlayReport.Verdict.LIKELY_CHEAT,
        ),
        analyzed_at__gte=since_24h,
    ).count()
    cert_breakdown = dict(
        FairPlayIntegrityProfile.objects.values("certificate_level")
        .annotate(n=Count("id"))
        .values_list("certificate_level", "n")
    )
    mm = pool_stats()
    waiting_shadow = 0
    waiting_total = 0
    if mmr.is_redis_matchmaking_available():
        waiting_shadow = mmr.shadow_searching_count()
        waiting_total = mmr.searching_count()

    return {
        "integrity_profiles": tracked,
        "shadow_pool_users": shadow_users,
        "avg_trust_score": round(float(avg_trust), 1),
        "certificate_levels": cert_breakdown,
        "pending_review_cases": pending_cases,
        "auto_recommendations_pending": auto_pending,
        "flagged_reports_24h": flagged_24h,
        "matchmaking": {
            **mm,
            "redis_waiting_shadow": waiting_shadow,
            "redis_waiting_total": waiting_total,
        },
        "auto_sanctions_enabled": bool(
            getattr(settings, "FAIRPLAY_AUTO_SANCTIONS_ENABLED", False)
        ),
        "auto_sanctions_shadow_mode": bool(
            getattr(settings, "FAIRPLAY_AUTO_SANCTIONS_SHADOW", True)
        ),
    }


def refresh_prometheus_fairplay_metrics() -> dict[str, int]:
    """Pousse les gauges fair play vers Prometheus."""
    stats = collect_fairplay_scale_stats()
    try:
        from apps.common.metrics import set_fairplay_scale_metrics

        set_fairplay_scale_metrics(
            shadow_users=stats["shadow_pool_users"],
            pending_cases=stats["pending_review_cases"],
            shadow_queue=stats["matchmaking"]["redis_waiting_shadow"],
            flagged_24h=stats["flagged_reports_24h"],
        )
    except Exception as exc:
        logger.warning("refresh_prometheus_fairplay_metrics: %s", exc)
    return {
        "shadow_pool_users": stats["shadow_pool_users"],
        "pending_cases": stats["pending_review_cases"],
    }


def batch_sync_shadow_pools() -> dict[str, int]:
    """
    Réconcilie shadow_pool en base (batch Celery).
    - Entrée shadow si trust/fusion/verdict récent
    - Sortie si confiance restaurée sans signal récent
    """
    batch = int(getattr(settings, "FAIRPLAY_SHADOW_BATCH_SIZE", 500))
    trust_max = _shadow_trust_max()
    fusion_min = _shadow_fusion_min()
    since = timezone.now() - timedelta(days=7)
    promoted = 0
    demoted = 0

    # Promouvoir vers shadow pool
    candidates = (
        FairPlayIntegrityProfile.objects.filter(shadow_pool=False)
        .filter(
            Q(trust_score__lt=trust_max)
            | Q(last_fusion_score__gte=fusion_min)
        )
        .order_by("trust_score")[:batch]
    )
    for profile in candidates:
        if user_is_fairplay_exempt(profile.user):
            continue
        recent_flag = FairPlayReport.objects.filter(
            user=profile.user,
            verdict__in=(
                FairPlayReport.Verdict.SUSPICIOUS,
                FairPlayReport.Verdict.LIKELY_CHEAT,
            ),
            analyzed_at__gte=since,
        ).exists()
        if (
            profile.trust_score < trust_max
            or profile.last_fusion_score >= fusion_min
            or recent_flag
        ):
            profile.shadow_pool = True
            profile.save(update_fields=["shadow_pool", "updated_at"])
            promoted += 1

    # Rétrograder hors shadow si confiance OK
    release_batch = batch // 2 or 100
    releasable = (
        FairPlayIntegrityProfile.objects.filter(shadow_pool=True)
        .filter(trust_score__gte=trust_max + 5)
        .filter(last_fusion_score__lt=fusion_min)
        .order_by("-trust_score")[:release_batch]
    )
    for profile in releasable:
        if user_is_fairplay_exempt(profile.user):
            continue
        recent_flag = FairPlayReport.objects.filter(
            user=profile.user,
            verdict__in=(
                FairPlayReport.Verdict.SUSPICIOUS,
                FairPlayReport.Verdict.LIKELY_CHEAT,
            ),
            analyzed_at__gte=since,
        ).exists()
        if not recent_flag:
            profile.shadow_pool = False
            profile.save(update_fields=["shadow_pool", "updated_at"])
            demoted += 1

    # Nettoyage file PostgreSQL legacy pour utilisateurs shadow
    shadow_user_ids = list(
        FairPlayIntegrityProfile.objects.filter(shadow_pool=True).values_list(
            "user_id", flat=True
        )[:2000]
    )
    pg_removed = 0
    if shadow_user_ids:
        pg_removed, _ = MatchmakingQueue.objects.filter(
            user_id__in=shadow_user_ids
        ).delete()

    refresh_prometheus_fairplay_metrics()
    return {
        "promoted_to_shadow": promoted,
        "released_from_shadow": demoted,
        "postgres_queue_cleaned": pg_removed,
    }
