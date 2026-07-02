"""Politique de sanctions Fair Play automatiques (graduées, conformes RGPD)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.utils import timezone

from .fairplay_exempt import user_is_fairplay_exempt
from .fairplay_service import player_baseline
from .models import FairPlayReport, FairPlayReviewCase


@dataclass
class AutoSanctionRecommendation:
    decision: str
    confidence: float
    reason: str
    block_days: int = 7


def _flagged_verdicts() -> set[str]:
    return {
        FairPlayReport.Verdict.SUSPICIOUS,
        FairPlayReport.Verdict.LIKELY_CHEAT,
    }


def count_flagged_reports(user, *, days: int = 30) -> int:
    since = timezone.now() - timedelta(days=days)
    return FairPlayReport.objects.filter(
        user=user,
        verdict__in=_flagged_verdicts(),
        analyzed_at__gte=since,
    ).count()


def count_likely_cheat_reports(user, *, days: int = 30) -> int:
    since = timezone.now() - timedelta(days=days)
    return FairPlayReport.objects.filter(
        user=user,
        verdict=FairPlayReport.Verdict.LIKELY_CHEAT,
        analyzed_at__gte=since,
    ).count()


def evaluate_auto_sanction(report: FairPlayReport, case: FairPlayReviewCase) -> AutoSanctionRecommendation | None:
    """Recommande warn ou matchmaking_block uniquement — jamais suspend."""
    user = report.user
    if user_is_fairplay_exempt(user):
        return None

    baseline = player_baseline(user, report.game)
    min_games = int(getattr(settings, "FAIRPLAY_AUTO_MIN_BASELINE_GAMES", 10))
    if int(baseline["games_analyzed"]) < min_games:
        return None

    if report.verdict not in _flagged_verdicts():
        return None

    peer_min = float(getattr(settings, "FAIRPLAY_AUTO_PEER_DELTA_MIN", 20.0))
    flagged_30d = count_flagged_reports(user, days=30)
    likely_30d = count_likely_cheat_reports(user, days=30)
    top1_threshold = float(getattr(settings, "FAIRPLAY_AUTO_ENGINE_TOP1_MIN", 0.65))

    if report.verdict == FairPlayReport.Verdict.LIKELY_CHEAT:
        if case.peer_score_delta >= peer_min and (
            likely_30d >= 2 or float(report.engine_top1_rate) >= top1_threshold
        ):
            return AutoSanctionRecommendation(
                decision=FairPlayReviewCase.Decision.MATCHMAKING_BLOCK,
                confidence=0.85 if likely_30d >= 2 else 0.75,
                reason="likely_cheat_peer_asymmetry",
                block_days=int(getattr(settings, "FAIRPLAY_AUTO_MM_BLOCK_DAYS", 7)),
            )

    warn_strikes = int(getattr(settings, "FAIRPLAY_AUTO_WARN_STRIKES", 2))
    if flagged_30d >= warn_strikes and report.verdict in _flagged_verdicts():
        return AutoSanctionRecommendation(
            decision=FairPlayReviewCase.Decision.WARN,
            confidence=0.7,
            reason="repeat_flagged_reports",
        )

    return None


def maybe_apply_auto_sanction(report: FairPlayReport, case: FairPlayReviewCase) -> dict[str, Any] | None:
    """Applique ou journalise (shadow) une sanction automatique graduée."""
    if case.status == FairPlayReviewCase.Status.CONFIRMED:
        return None

    rec = evaluate_auto_sanction(report, case)
    if not rec:
        return None

    shadow = bool(getattr(settings, "FAIRPLAY_AUTO_SANCTIONS_SHADOW", False))
    enabled = bool(getattr(settings, "FAIRPLAY_AUTO_SANCTIONS_ENABLED", False))

    from .fairplay_audit import log_fairplay_audit
    from .models import FairPlayAuditLog

    if shadow or not enabled:
        log_fairplay_audit(
            action=FairPlayAuditLog.Action.AUTO_RECOMMEND,
            staff=None,
            target_type="case",
            target_id=case.id,
            metadata={
                "decision": rec.decision,
                "confidence": rec.confidence,
                "reason": rec.reason,
                "report_id": report.id,
                "user_id": report.user_id,
                "shadow": True,
            },
        )
        case.auto_recommended_decision = rec.decision
        case.auto_confidence = rec.confidence
        case.save(update_fields=["auto_recommended_decision", "auto_confidence", "updated_at"])
        return {"shadow": True, "decision": rec.decision, "confidence": rec.confidence}

    from .fairplay_review import apply_auto_sanction

    return apply_auto_sanction(case, rec)


def reevaluate_game_auto_sanctions(game) -> None:
    """Réévalue les cas une fois les deux rapports post-partie disponibles."""
    from .fairplay_review import compute_peer_score_delta
    from .models import FairPlayReviewCase

    reports = FairPlayReport.objects.filter(game=game).select_related("user")
    if reports.count() < 2:
        return
    for report in reports:
        case = FairPlayReviewCase.objects.filter(report=report).first()
        if not case or case.status == FairPlayReviewCase.Status.CONFIRMED:
            continue
        peer_delta = compute_peer_score_delta(game, report)
        if case.peer_score_delta != peer_delta:
            case.peer_score_delta = peer_delta
            case.save(update_fields=["peer_score_delta", "updated_at"])
        maybe_apply_auto_sanction(report, case)
