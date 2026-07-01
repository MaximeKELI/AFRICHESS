"""Revue humaine Fair Play, comparaison pair-à-pair, sanctions staff."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone

from apps.notifications.models import Notification

from .fairplay_audit import log_fairplay_audit
from .fairplay_service import player_baseline
from .models import (
    FairPlayAppeal,
    FairPlayAuditLog,
    FairPlayReport,
    FairPlayReviewCase,
    FairPlaySanction,
    Game,
    GameFairPlayTelemetry,
)

User = get_user_model()

FLAGGED_VERDICTS = {
    FairPlayReport.Verdict.REVIEW,
    FairPlayReport.Verdict.SUSPICIOUS,
    FairPlayReport.Verdict.LIKELY_CHEAT,
    FairPlayReport.Verdict.ENGINE_UNAVAILABLE,
}


def _report_dict(report: FairPlayReport) -> dict[str, Any]:
    return {
        "id": report.id,
        "user_id": report.user_id,
        "username": report.user.username,
        "verdict": report.verdict,
        "overall_score": report.overall_score,
        "engine_top1_rate": report.engine_top1_rate,
        "engine_top3_rate": report.engine_top3_rate,
        "avg_centipawn_loss": report.avg_centipawn_loss,
        "accuracy_estimate": report.accuracy_estimate,
        "signals": report.signals_json or [],
        "move_evals": report.move_evals_json or [],
        "analyzed_at": report.analyzed_at.isoformat() if report.analyzed_at else None,
    }


def _telemetry_dict(row: GameFairPlayTelemetry | None) -> dict[str, Any]:
    if not row:
        return {}
    data = row.data or {}
    return {
        "tab_blur_count": int(data.get("tab_blur_count", 0)),
        "focus_loss_ms": int(data.get("focus_loss_ms", 0)),
        "window_switch_count": int(data.get("window_switch_count", 0)),
        "copy_paste_events": int(data.get("copy_paste_events", 0)),
        "devtools_open_count": int(data.get("devtools_open_count", 0)),
        "mouse_entropy": float(data.get("mouse_entropy", 0.0)),
        "premove_count": int(data.get("premove_count", 0)),
    }


def peer_comparison(game: Game) -> dict[str, Any]:
    reports = list(
        FairPlayReport.objects.filter(game=game)
        .select_related("user", "review_case")
        .order_by("user_id")
    )
    telemetry = {
        t.user_id: t
        for t in GameFairPlayTelemetry.objects.filter(game=game).select_related("user")
    }
    players = []
    for report in reports:
        case = FairPlayReviewCase.objects.filter(report_id=report.id).first()
        players.append(
            {
                **_report_dict(report),
                "telemetry": _telemetry_dict(telemetry.get(report.user_id)),
                "review_status": case.status if case else None,
                "is_white": game.white_player_id == report.user_id,
            }
        )
    delta_score = 0.0
    delta_top1 = 0.0
    if len(players) == 2:
        delta_score = abs(players[0]["overall_score"] - players[1]["overall_score"])
        delta_top1 = abs(players[0]["engine_top1_rate"] - players[1]["engine_top1_rate"])
    return {
        "players": players,
        "peer_delta": {
            "overall_score": round(delta_score, 2),
            "engine_top1_rate": round(delta_top1, 3),
            "asymmetric_engine_use": delta_top1 >= 0.35 and delta_score >= 25.0,
        },
    }


def compute_peer_score_delta(game: Game, report: FairPlayReport) -> float:
    opponent_report = (
        FairPlayReport.objects.filter(game=game)
        .exclude(user_id=report.user_id)
        .order_by("-overall_score")
        .first()
    )
    if not opponent_report:
        return 0.0
    return abs(report.overall_score - opponent_report.overall_score)


def open_review_case(report: FairPlayReport) -> FairPlayReviewCase | None:
    if report.verdict not in FLAGGED_VERDICTS:
        return None
    peer_delta = compute_peer_score_delta(report.game, report)
    case, created = FairPlayReviewCase.objects.get_or_create(
        report=report,
        defaults={"peer_score_delta": peer_delta},
    )
    if not created and case.peer_score_delta != peer_delta:
        case.peer_score_delta = peer_delta
        case.save(update_fields=["peer_score_delta", "updated_at"])
    if created and report.verdict == FairPlayReport.Verdict.LIKELY_CHEAT:
        _notify_staff_new_case(case)
    return case


def _notify_staff_new_case(case: FairPlayReviewCase) -> None:
    report = case.report
    title = f"Fair Play : {report.user.username} — {report.verdict}"
    body = (
        f"Partie {report.game_id} — score {report.overall_score:.1f}, "
        f"écart pair {case.peer_score_delta:.1f}"
    )
    for staff in User.objects.filter(is_staff=True, is_active=True).only("id")[:20]:
        Notification.objects.create(
            user_id=staff.id,
            type=Notification.Type.SYSTEM,
            title=title,
            body=body,
            data={
                "kind": "fairplay_review",
                "game_id": str(report.game_id),
                "report_id": report.id,
                "case_id": case.id,
            },
        )


def fairplay_queue_overview() -> dict[str, Any]:
    pending = FairPlayReviewCase.objects.filter(status=FairPlayReviewCase.Status.PENDING).count()
    in_review = FairPlayReviewCase.objects.filter(status=FairPlayReviewCase.Status.IN_REVIEW).count()
    by_verdict = dict(
        FairPlayReport.objects.filter(verdict__in=FLAGGED_VERDICTS)
        .values("verdict")
        .annotate(count=Count("id"))
        .values_list("verdict", "count")
    )
    return {
        "pending_cases": pending,
        "in_review_cases": in_review,
        "flagged_by_verdict": by_verdict,
        "likely_cheat_7d": FairPlayReport.objects.filter(
            verdict=FairPlayReport.Verdict.LIKELY_CHEAT,
            analyzed_at__gte=timezone.now() - timedelta(days=7),
        ).count(),
        "engine_unavailable_7d": FairPlayReport.objects.filter(
            verdict=FairPlayReport.Verdict.ENGINE_UNAVAILABLE,
            analyzed_at__gte=timezone.now() - timedelta(days=7),
        ).count(),
        "pending_appeals": FairPlayAppeal.objects.filter(
            status=FairPlayAppeal.Status.PENDING
        ).count(),
    }


def list_review_queue(
    *,
    status: str | None = None,
    verdict: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    qs = (
        FairPlayReviewCase.objects.select_related(
            "report",
            "report__user",
            "report__game",
            "reviewer",
        )
        .order_by("-peer_score_delta", "-report__overall_score")
    )
    if status:
        qs = qs.filter(status=status)
    if verdict:
        qs = qs.filter(report__verdict=verdict)
    total = qs.count()
    cases = []
    for case in qs[offset : offset + limit]:
        report = case.report
        game = report.game
        cases.append(
            {
                "id": case.id,
                "status": case.status,
                "peer_score_delta": case.peer_score_delta,
                "decision": case.decision,
                "created_at": case.created_at.isoformat(),
                "reviewer": case.reviewer.username if case.reviewer else None,
                "report": _report_dict(report),
                "game": {
                    "id": str(game.id),
                    "mode": game.mode,
                    "result": game.result,
                    "ended_at": game.ended_at.isoformat() if game.ended_at else None,
                    "white": game.white_player.username if game.white_player else None,
                    "black": game.black_player.username if game.black_player else None,
                },
            }
        )
    return {"total": total, "cases": cases}


def game_fairplay_detail(game_id: str) -> dict[str, Any] | None:
    try:
        game = Game.objects.select_related("white_player", "black_player").get(id=game_id)
    except Game.DoesNotExist:
        return None
    comparison = peer_comparison(game)
    cases = list(
        FairPlayReviewCase.objects.filter(report__game=game)
        .select_related("report", "report__user", "reviewer")
        .order_by("-report__overall_score")
    )
    return {
        "game": {
            "id": str(game.id),
            "mode": game.mode,
            "result": game.result,
            "status": game.status,
            "pgn": game.pgn,
            "ended_at": game.ended_at.isoformat() if game.ended_at else None,
            "white": game.white_player.username if game.white_player else None,
            "black": game.black_player.username if game.black_player else None,
        },
        "peer_comparison": comparison,
        "cases": [
            {
                "id": c.id,
                "status": c.status,
                "decision": c.decision,
                "notes": c.notes,
                "peer_score_delta": c.peer_score_delta,
                "reviewer": c.reviewer.username if c.reviewer else None,
                "decided_at": c.decided_at.isoformat() if c.decided_at else None,
                "username": c.report.user.username,
                "report_id": c.report_id,
            }
            for c in cases
        ],
    }


def user_fairplay_summary(user_id: int) -> dict[str, Any] | None:
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return None
    reports = (
        FairPlayReport.objects.filter(user=user, game__is_vs_ai=False, game__is_rated=True)
        .select_related("game", "review_case")
        .order_by("-analyzed_at")[:15]
    )
    by_verdict = dict(
        FairPlayReport.objects.filter(user=user)
        .values("verdict")
        .annotate(count=Count("id"))
        .values_list("verdict", "count")
    )
    active_sanctions = list(
        FairPlaySanction.objects.filter(user=user, is_active=True)
        .order_by("-created_at")
        .values("sanction_type", "until", "created_at", "notes")
    )
    sample_game = reports[0].game if reports else Game(mode=Game.Mode.BLITZ)
    baseline = player_baseline(user, sample_game)
    return {
        "by_verdict": by_verdict,
        "baseline": baseline,
        "active_sanctions": [
            {
                **s,
                "until": s["until"].isoformat() if s["until"] else None,
                "created_at": s["created_at"].isoformat(),
            }
            for s in active_sanctions
        ],
        "recent_reports": [
            {
                **_report_dict(r),
                "game_id": str(r.game_id),
                "game_mode": r.game.mode,
                "review_status": getattr(r.review_case, "status", None),
            }
            for r in reports
        ],
    }


def apply_review_decision(
    case_id: int,
    staff_user,
    *,
    status: str,
    decision: str,
    notes: str = "",
    suspend_days: int | None = None,
    request=None,
) -> dict[str, Any]:
    try:
        case = FairPlayReviewCase.objects.select_related("report", "report__user").get(pk=case_id)
    except FairPlayReviewCase.DoesNotExist:
        return {"error": "Case not found"}

    if status not in FairPlayReviewCase.Status.values:
        return {"error": "Invalid status"}
    if decision not in FairPlayReviewCase.Decision.values:
        return {"error": "Invalid decision"}

    case.status = status
    case.decision = decision
    case.notes = notes or case.notes
    case.reviewer = staff_user
    case.decided_at = timezone.now()
    case.save()

    sanction = None
    if status == FairPlayReviewCase.Status.CONFIRMED and decision != FairPlayReviewCase.Decision.NONE:
        sanction = _apply_sanction(case, staff_user, decision, suspend_days=suspend_days)

    log_fairplay_audit(
        action=FairPlayAuditLog.Action.DECIDE_CASE,
        staff=staff_user,
        target_type="case",
        target_id=case.id,
        request=request,
        metadata={
            "status": case.status,
            "decision": case.decision,
            "report_id": case.report_id,
            "user_id": case.report.user_id,
            "sanction_id": sanction.id if sanction else None,
        },
    )

    return {
        "ok": True,
        "case_id": case.id,
        "status": case.status,
        "decision": case.decision,
        "sanction_id": sanction.id if sanction else None,
    }


def _apply_sanction(
    case: FairPlayReviewCase,
    staff_user,
    decision: str,
    *,
    suspend_days: int | None,
) -> FairPlaySanction | None:
    user = case.report.user
    until = None
    sanction_type = decision

    FairPlaySanction.objects.filter(user=user, is_active=True).update(is_active=False)

    if decision == FairPlayReviewCase.Decision.WARN:
        Notification.objects.create(
            user=user,
            type=Notification.Type.SYSTEM,
            title="Avertissement Fair Play",
            body=case.notes or "Votre comportement en partie a été signalé par notre équipe.",
            data={"kind": "fairplay_warn", "case_id": case.id},
        )
    elif decision == FairPlayReviewCase.Decision.MATCHMAKING_BLOCK:
        until = timezone.now() + timedelta(days=suspend_days or 7)
    elif decision == FairPlayReviewCase.Decision.SUSPEND_TEMP:
        until = timezone.now() + timedelta(days=suspend_days or 3)
        user.is_active = False
        user.save(update_fields=["is_active"])
    elif decision == FairPlayReviewCase.Decision.SUSPEND_PERM:
        user.is_active = False
        user.save(update_fields=["is_active"])

    if decision == FairPlayReviewCase.Decision.WARN:
        sanction_type = FairPlaySanction.SanctionType.WARN
    elif decision == FairPlayReviewCase.Decision.MATCHMAKING_BLOCK:
        sanction_type = FairPlaySanction.SanctionType.MATCHMAKING_BLOCK
    elif decision == FairPlayReviewCase.Decision.SUSPEND_TEMP:
        sanction_type = FairPlaySanction.SanctionType.SUSPEND_TEMP
    elif decision == FairPlayReviewCase.Decision.SUSPEND_PERM:
        sanction_type = FairPlaySanction.SanctionType.SUSPEND_PERM
    else:
        return None

    return FairPlaySanction.objects.create(
        user=user,
        review_case=case,
        sanction_type=sanction_type,
        until=until,
        is_active=True,
        notes=case.notes,
        created_by=staff_user,
    )


def user_has_active_matchmaking_block(user) -> bool:
    from .fairplay_exempt import user_is_fairplay_exempt

    if user_is_fairplay_exempt(user):
        return False
    now = timezone.now()
    return FairPlaySanction.objects.filter(
        user=user,
        is_active=True,
        sanction_type=FairPlaySanction.SanctionType.MATCHMAKING_BLOCK,
    ).filter(Q(until__isnull=True) | Q(until__gt=now)).exists()


def user_fairplay_restrictions(user) -> dict[str, Any]:
    from .fairplay_exempt import user_is_fairplay_exempt

    if user_is_fairplay_exempt(user):
        return {
            "matchmaking_blocked": False,
            "suspended": False,
        }
    now = timezone.now()
    qs = FairPlaySanction.objects.filter(user=user, is_active=True).filter(
        Q(until__isnull=True) | Q(until__gt=now)
    )
    return {
        "matchmaking_blocked": qs.filter(
            sanction_type=FairPlaySanction.SanctionType.MATCHMAKING_BLOCK
        ).exists(),
        "suspended": not user.is_active
        or qs.filter(
            sanction_type__in=(
                FairPlaySanction.SanctionType.SUSPEND_TEMP,
                FairPlaySanction.SanctionType.SUSPEND_PERM,
            )
        ).exists(),
    }


def expire_fairplay_sanctions() -> dict[str, int]:
    """Désactive les sanctions expirées et réactive les comptes suspendus temporairement."""
    now = timezone.now()
    expired_qs = FairPlaySanction.objects.filter(is_active=True, until__isnull=False, until__lte=now)
    expired_user_ids = set(expired_qs.values_list("user_id", flat=True))
    expired_count = expired_qs.update(is_active=False)

    reactivated = 0
    for user_id in expired_user_ids:
        user = User.objects.filter(pk=user_id).first()
        if not user or user.is_active:
            continue
        still_suspended = FairPlaySanction.objects.filter(
            user_id=user_id,
            is_active=True,
            sanction_type__in=(
                FairPlaySanction.SanctionType.SUSPEND_TEMP,
                FairPlaySanction.SanctionType.SUSPEND_PERM,
            ),
        ).filter(Q(until__isnull=True) | Q(until__gt=now)).exists()
        if not still_suspended:
            user.is_active = True
            user.save(update_fields=["is_active"])
            reactivated += 1
            log_fairplay_audit(
                action=FairPlayAuditLog.Action.SANCTION_EXPIRED,
                target_type="user",
                target_id=user_id,
                metadata={"reactivated": True},
            )

    return {"expired_sanctions": expired_count, "reactivated_users": reactivated}


def submit_fairplay_appeal(user, review_case_id: int, reason: str) -> dict[str, Any]:
    try:
        case = FairPlayReviewCase.objects.select_related("report").get(pk=review_case_id)
    except FairPlayReviewCase.DoesNotExist:
        return {"error": "Case not found"}
    if case.report.user_id != user.id:
        return {"error": "Forbidden"}
    if case.status not in (
        FairPlayReviewCase.Status.CONFIRMED,
        FairPlayReviewCase.Status.ESCALATED,
    ):
        return {"error": "Appeal only allowed on confirmed/escalated cases"}
    if FairPlayAppeal.objects.filter(
        user=user,
        review_case=case,
        status__in=(FairPlayAppeal.Status.PENDING, FairPlayAppeal.Status.UNDER_REVIEW),
    ).exists():
        return {"error": "Appeal already pending"}
    appeal = FairPlayAppeal.objects.create(
        user=user,
        review_case=case,
        reason=reason[:4000],
    )
    for staff in User.objects.filter(is_staff=True, is_active=True).only("id")[:20]:
        Notification.objects.create(
            user_id=staff.id,
            type=Notification.Type.SYSTEM,
            title=f"Recours Fair Play — {user.username}",
            body=reason[:200],
            data={"kind": "fairplay_appeal", "appeal_id": appeal.id, "case_id": case.id},
        )
    return {"ok": True, "appeal_id": appeal.id}


def resolve_fairplay_appeal(
    appeal_id: int,
    staff_user,
    *,
    status: str,
    staff_response: str = "",
    request=None,
) -> dict[str, Any]:
    try:
        appeal = FairPlayAppeal.objects.select_related("review_case", "user").get(pk=appeal_id)
    except FairPlayAppeal.DoesNotExist:
        return {"error": "Appeal not found"}
    if status not in (FairPlayAppeal.Status.ACCEPTED, FairPlayAppeal.Status.REJECTED):
        return {"error": "Invalid status"}
    appeal.status = status
    appeal.staff_response = staff_response[:4000]
    appeal.resolved_at = timezone.now()
    appeal.save(update_fields=["status", "staff_response", "resolved_at"])
    if status == FairPlayAppeal.Status.ACCEPTED:
        case = appeal.review_case
        case.status = FairPlayReviewCase.Status.DISMISSED
        case.decision = FairPlayReviewCase.Decision.NONE
        case.reviewer = staff_user
        case.decided_at = timezone.now()
        case.notes = (case.notes + "\n[Appeal accepted] " + staff_response).strip()[:2000]
        case.save()
        FairPlaySanction.objects.filter(user=appeal.user, is_active=True).update(is_active=False)
        if not appeal.user.is_active:
            appeal.user.is_active = True
            appeal.user.save(update_fields=["is_active"])
    Notification.objects.create(
        user=appeal.user,
        type=Notification.Type.SYSTEM,
        title="Décision sur votre recours Fair Play",
        body=staff_response[:500] or ("Recours accepté." if status == FairPlayAppeal.Status.ACCEPTED else "Recours rejeté."),
        data={"kind": "fairplay_appeal_resolved", "appeal_id": appeal.id, "status": status},
    )
    log_fairplay_audit(
        action=FairPlayAuditLog.Action.APPEAL_RESOLVED,
        staff=staff_user,
        target_type="appeal",
        target_id=appeal.id,
        request=request,
        metadata={"status": status, "user_id": appeal.user_id},
    )
    return {"ok": True, "appeal_id": appeal.id, "status": status}
