"""AFRICHESS Integrity Engine (AIE) — score de confiance & shadow pools."""

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .fairplay_exempt import user_is_fairplay_exempt
from .models import FairPlayIntegrityProfile, FairPlayReport, Game

TRUST_DEFAULT = 85.0
CERT_LEVELS = (
    (95, "trusted"),
    (88, "gold"),
    (75, "silver"),
    (60, "bronze"),
    (0, "probation"),
)


def certificate_level(trust_score: float, clean_streak: int) -> str:
    adjusted = trust_score + min(clean_streak * 0.15, 5.0)
    for threshold, label in CERT_LEVELS:
        if adjusted >= threshold:
            return label
    return "probation"


def get_or_create_profile(user) -> FairPlayIntegrityProfile:
    profile, _ = FairPlayIntegrityProfile.objects.get_or_create(
        user=user,
        defaults={"trust_score": TRUST_DEFAULT},
    )
    return profile


def _timing_signature_update(
    data: dict,
    think_ms: int | None,
    complexity_cp: int | None,
) -> dict:
    sig = dict(data.get("timing_signature") or {})
    if think_ms is None:
        return sig
    bucket = "fast" if think_ms < 800 else "normal" if think_ms < 4000 else "slow"
    counts = dict(sig.get("buckets") or {})
    counts[bucket] = int(counts.get(bucket, 0)) + 1
    sig["buckets"] = counts
    if complexity_cp and think_ms < 400 and complexity_cp > 200:
        sig["instant_complex"] = int(sig.get("instant_complex", 0)) + 1
    sig["samples"] = int(sig.get("samples", 0)) + 1
    return sig


def compute_live_move_score(
    *,
    think_ms: int | None,
    complexity_cp: int | None,
    clock_drift_ms: int | None,
    telemetry: dict | None,
) -> float:
    """Score 0–100 par coup (invisible adversaire, agrégé post-partie)."""
    score = 100.0
    if clock_drift_ms is not None and clock_drift_ms > 2500:
        score -= min(35.0, clock_drift_ms / 200.0)
    instant_complex = (
        think_ms is not None
        and complexity_cp is not None
        and think_ms < 300
        and complexity_cp > 180
    )
    if instant_complex:
        score -= 22.0
    if telemetry:
        if int(telemetry.get("tab_blur", 0) or 0) > 0:
            score -= 8.0
        if int(telemetry.get("copy_paste", 0) or 0) > 0:
            score -= 12.0
        if int(telemetry.get("devtools", 0) or 0) > 0:
            score -= 15.0
        entropy = float(telemetry.get("mouse_entropy") or 1.0)
        if entropy < 0.15:
            score -= 10.0
    return max(0.0, min(100.0, score))


def detect_clock_drift_ms(
    game: Game,
    user,
    think_ms: int | None,
) -> int | None:
    """Compare temps client vs delta serveur depuis le dernier coup du joueur."""
    if think_ms is None or think_ms <= 0:
        return None
    from .models import Move

    last_own = (
        Move.objects.filter(game=game)
        .order_by("-move_number")
        .first()
    )
    if not last_own:
        return None
    is_white = game.white_player_id == user.id
    if last_own.played_by_white != is_white:
        return None
    server_delta = int(
        (timezone.now() - last_own.created_at).total_seconds() * 1000
    )
    return abs(server_delta - int(think_ms))


def record_live_move_integrity(
    game: Game,
    user,
    *,
    think_ms: int | None,
    telemetry: dict | None,
    complexity_cp: int | None = None,
) -> float:
    from .models import GameFairPlayTelemetry

    if user_is_fairplay_exempt(user) or game.is_vs_ai:
        return 100.0
    drift = detect_clock_drift_ms(game, user, think_ms)
    move_score = compute_live_move_score(
        think_ms=think_ms,
        complexity_cp=complexity_cp,
        clock_drift_ms=drift,
        telemetry=telemetry,
    )
    row, _ = GameFairPlayTelemetry.objects.get_or_create(game=game, user=user)
    data = dict(row.data or {})
    scores = list(data.get("live_integrity_scores") or [])
    scores.append(round(move_score, 1))
    data["live_integrity_scores"] = scores[-120:]
    if drift and drift > int(getattr(settings, "FAIRPLAY_CLOCK_DRIFT_MS", 2500)):
        data["clock_drift_flags"] = int(data.get("clock_drift_flags", 0)) + 1
    data["timing_signature"] = _timing_signature_update(
        data, think_ms, complexity_cp
    )
    row.data = data
    row.save(update_fields=["data", "updated_at"])
    return move_score


def fuse_analysis_fairplay(
    report: FairPlayReport,
    analysis_moves: list[dict],
) -> dict[str, Any]:
    """Fusion analyse Stockfish × rapport C++ — signal AIE."""
    if not analysis_moves:
        return {"fusion_score": 0.0, "signals": []}
    user_is_white = report.user_id == report.game.white_player_id
    user_moves = [
        m for m in analysis_moves if m.get("played_by_white") is user_is_white
    ]
    if not user_moves:
        return {"fusion_score": 0.0, "signals": []}
    avg_cp = sum(float(m.get("cp_loss") or 0) for m in user_moves) / len(user_moves)
    analysis_acc = max(0.0, 100.0 - avg_cp * 0.35)
    top1 = float(report.engine_top1_rate)
    fusion = 0.0
    signals: list[dict] = []
    if top1 >= 0.7 and analysis_acc < 72:
        fusion += 28.0
        signals.append("analysis_engine_divergence")
    if top1 >= 0.55 and float(report.avg_centipawn_loss) < 18:
        fusion += 15.0
        signals.append("low_cpl_high_top1")
    live_avg = 0.0
    tel = report.game.fairplay_telemetry.filter(user=report.user).first()
    if tel and tel.data:
        live_scores = tel.data.get("live_integrity_scores") or []
        if live_scores:
            live_avg = sum(live_scores) / len(live_scores)
            if live_avg < 70 and top1 >= 0.6:
                fusion += 20.0
                signals.append("live_integrity_engine_combo")
    return {
        "fusion_score": round(fusion, 1),
        "signals": signals,
        "analysis_accuracy_est": round(analysis_acc, 1),
        "live_integrity_avg": round(live_avg, 1),
    }


@transaction.atomic
def update_integrity_after_game(
    game: Game,
    user,
    report: FairPlayReport | None,
) -> FairPlayIntegrityProfile | None:
    if user_is_fairplay_exempt(user) or game.is_vs_ai or not game.is_rated:
        return None
    profile = get_or_create_profile(user)
    profile.games_tracked += 1
    delta = 0.0
    verdict = report.verdict if report else FairPlayReport.Verdict.CLEAN
    if verdict == FairPlayReport.Verdict.CLEAN:
        profile.clean_streak += 1
        delta += 0.35
    elif verdict == FairPlayReport.Verdict.REVIEW:
        profile.clean_streak = 0
        delta -= 1.5
    elif verdict == FairPlayReport.Verdict.SUSPICIOUS:
        profile.clean_streak = 0
        delta -= 6.0
    elif verdict == FairPlayReport.Verdict.LIKELY_CHEAT:
        profile.clean_streak = 0
        delta -= 15.0

    if report:
        fusion: dict[str, Any] = {}
        try:
            analysis = game.analysis
            fusion = fuse_analysis_fairplay(report, analysis.best_moves_json or [])
        except Exception:
            fusion = {}
        profile.last_fusion_score = float(fusion.get("fusion_score") or 0)
        if fusion.get("fusion_score", 0) >= 25:
            delta -= 8.0
        tel = game.fairplay_telemetry.filter(user=user).first()
        if tel and tel.data:
            live_scores = tel.data.get("live_integrity_scores") or []
            if live_scores:
                profile.live_integrity_avg = sum(live_scores) / len(live_scores)
            sig = tel.data.get("timing_signature") or {}
            profile.timing_signature_json = sig

    profile.trust_score = max(
        5.0,
        min(100.0, profile.trust_score + delta),
    )
    shadow_threshold = float(
        getattr(settings, "FAIRPLAY_SHADOW_TRUST_MAX", 55.0)
    )
    fusion_threshold = float(
        getattr(settings, "FAIRPLAY_SHADOW_FUSION_MIN", 30.0)
    )
    profile.shadow_pool = (
        profile.trust_score < shadow_threshold
        or profile.last_fusion_score >= fusion_threshold
        or (
            report is not None
            and report.verdict
            in (
                FairPlayReport.Verdict.SUSPICIOUS,
                FairPlayReport.Verdict.LIKELY_CHEAT,
            )
        )
    )
    profile.certificate_level = certificate_level(
        profile.trust_score, profile.clean_streak
    )
    profile.save()
    return profile


def integrity_hints_for_user(game: Game, user) -> dict | None:
    report = FairPlayReport.objects.filter(game=game, user=user).first()
    if not report:
        return None
    acc = None
    try:
        moves = game.analysis.best_moves_json or []
        is_white = user.id == game.white_player_id
        subset = [m for m in moves if m.get("played_by_white") is is_white]
        if subset:
            avg_cp = sum(float(m.get("cp_loss") or 0) for m in subset) / len(subset)
            acc = max(0.0, 100.0 - avg_cp * 0.35)
    except Exception:
        pass
    profile = FairPlayIntegrityProfile.objects.filter(user=user).first()
    return {
        "verdict": report.verdict,
        "engine_top1_rate": report.engine_top1_rate,
        "analysis_accuracy": acc,
        "trust_score": profile.trust_score if profile else None,
        "fusion_score": profile.last_fusion_score if profile else None,
    }


def user_in_shadow_pool(user) -> bool:
    if user_is_fairplay_exempt(user):
        return False
    profile = FairPlayIntegrityProfile.objects.filter(user=user).first()
    return bool(profile and profile.shadow_pool)
