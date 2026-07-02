"""Orchestration anti-triche — binaire C++ fairplay + fallback Python."""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
from typing import Any

from pathlib import Path

from django.conf import settings

from apps.notifications.models import Notification
from apps.ratings.models import PlayerRating

from .fairplay_audit import log_fairplay_audit
from .models import FairPlayReport, Game, GameFairPlayTelemetry, Move

logger = logging.getLogger(__name__)

ENGINE_UNAVAILABLE_VERDICT = FairPlayReport.Verdict.ENGINE_UNAVAILABLE


def _fairplay_bin() -> str | None:
    candidates = [
        getattr(settings, "FAIRPLAY_BIN", ""),
        str(Path(__file__).resolve().parents[2] / "bin/africhess-fairplay"),
        "/anticheat-cpp/build/africhess-fairplay",
        "/usr/local/bin/africhess-fairplay",
    ]
    for path in candidates:
        if path and (shutil.which(path) or os.path.isfile(path)):
            return path
    return None


def _mode_for_rating(game: Game) -> str:
    mode = game.mode
    if mode == Game.Mode.AI:
        return "blitz"
    if mode == Game.Mode.CORRESPONDENCE:
        return "rapid"
    return mode


def _player_elo(user, game: Game) -> int:
    mode = _mode_for_rating(game)
    try:
        rating = PlayerRating.objects.get(user=user, mode=mode)
        return rating.elo
    except PlayerRating.DoesNotExist:
        return getattr(settings, "DEFAULT_ELO", 1200)


def player_baseline(user, game: Game) -> dict[str, float | int]:
    """Profil Fair Play sur les N dernières parties — évite les faux positifs sur joueurs forts."""
    mode = _mode_for_rating(game)
    reports = (
        FairPlayReport.objects.filter(
            user=user,
            game__mode=mode,
            game__is_rated=True,
            game__is_vs_ai=False,
        )
        .exclude(game=game)
        .order_by("-analyzed_at")[:20]
    )
    if len(reports) < 5:
        return {
            "games_analyzed": len(reports),
            "avg_accuracy": 0.0,
            "avg_top1_rate": 0.0,
            "avg_cpl": 0.0,
            "avg_overall_score": 0.0,
        }
    n = len(reports)
    return {
        "games_analyzed": n,
        "avg_accuracy": sum(r.accuracy_estimate for r in reports) / n,
        "avg_top1_rate": sum(r.engine_top1_rate for r in reports) / n,
        "avg_cpl": sum(r.avg_centipawn_loss for r in reports) / n,
        "avg_overall_score": sum(r.overall_score for r in reports) / n,
    }


def build_game_input(game: Game, user, *, analysis_mode: str = "full") -> dict[str, Any]:
    is_white = game.white_player_id == user.id
    telemetry_row, _ = GameFairPlayTelemetry.objects.get_or_create(game=game, user=user)
    t = telemetry_row.data or {}
    moves_payload = []
    for mv in game.moves.order_by("move_number"):
        moves_payload.append(
            {
                "uci": mv.uci,
                "san": mv.san,
                "played_by_white": mv.played_by_white,
                "move_number": mv.move_number,
                "think_ms": mv.think_ms or 0,
                "complexity_cp": mv.complexity_cp or 0,
            }
        )
    return {
        "game_id": str(game.id),
        "player_elo": _player_elo(user, game),
        "player_is_white": is_white,
        "mode": _mode_for_rating(game),
        "is_rated": game.is_rated,
        "stockfish_path": settings.STOCKFISH_PATH,
        "engine_depth": min(getattr(settings, "FAIRPLAY_DEPTH", 14), settings.ENGINE_DEPTH),
        "analysis_mode": analysis_mode,
        "baseline": player_baseline(user, game),
        "telemetry": {
            "tab_blur_count": int(t.get("tab_blur_count", 0)),
            "focus_loss_ms": int(t.get("focus_loss_ms", 0)),
            "window_switch_count": int(t.get("window_switch_count", 0)),
            "copy_paste_events": int(t.get("copy_paste_events", 0)),
            "devtools_open_count": int(t.get("devtools_open_count", 0)),
            "mouse_entropy": float(t.get("mouse_entropy", 0.0)),
            "premove_count": int(t.get("premove_count", 0)),
        },
        "moves": moves_payload,
    }


def _engine_unavailable_result(reason: str) -> dict[str, Any]:
    return {
        "overall_score": 0.0,
        "verdict": ENGINE_UNAVAILABLE_VERDICT,
        "signals": [
            {
                "code": "ENGINE_UNAVAILABLE",
                "score": 0.0,
                "weight": 0.0,
                "detail": reason[:500],
            }
        ],
        "move_evals": [],
        "engine_top1_rate": 0.0,
        "engine_top3_rate": 0.0,
        "avg_centipawn_loss": 0.0,
        "accuracy_estimate": 0.0,
        "analysis_error": reason[:500],
    }


def _notify_ops_engine_failure(game: Game, user, reason: str) -> None:
    logger.error("FairPlay engine unavailable game=%s user=%s: %s", game.id, user.id, reason)
    log_fairplay_audit(
        action="engine_failure",
        target_type="game",
        target_id=str(game.id),
        metadata={"user_id": user.id, "reason": reason[:500]},
    )
    from django.contrib.auth import get_user_model

    User = get_user_model()
    title = "Fair Play : moteur d'analyse indisponible"
    body = f"Partie {game.id} — joueur {user.username} — {reason[:200]}"
    for staff in User.objects.filter(is_staff=True, is_active=True).only("id")[:20]:
        Notification.objects.create(
            user_id=staff.id,
            type=Notification.Type.SYSTEM,
            title=title,
            body=body,
            data={
                "kind": "fairplay_engine_failure",
                "game_id": str(game.id),
                "user_id": user.id,
            },
        )


def run_fairplay_analysis(
    game: Game,
    user,
    *,
    analysis_mode: str = "full",
) -> tuple[dict[str, Any], str | None]:
    """Retourne (result, error_reason). error_reason non-None si moteur indisponible."""
    payload = build_game_input(game, user, analysis_mode=analysis_mode)
    binary = _fairplay_bin()
    if not binary:
        reason = "FairPlay binary not found"
        logger.warning("%s — game %s", reason, game.id)
        return _engine_unavailable_result(reason), reason
    try:
        proc = subprocess.run(
            [binary],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=getattr(settings, "FAIRPLAY_TIMEOUT", 120),
            check=False,
        )
    except subprocess.TimeoutExpired:
        reason = "FairPlay subprocess timeout"
        logger.exception("%s — game %s", reason, game.id)
        return _engine_unavailable_result(reason), reason
    except OSError as exc:
        reason = f"FairPlay subprocess error: {exc}"
        logger.exception("%s — game %s", reason, game.id)
        return _engine_unavailable_result(reason), reason
    if proc.returncode != 0 or not proc.stdout.strip():
        reason = f"FairPlay rc={proc.returncode} stderr={(proc.stderr or '')[:300]}"
        logger.warning("FairPlay error game=%s %s", game.id, reason)
        return _engine_unavailable_result(reason), reason
    try:
        return json.loads(proc.stdout), None
    except json.JSONDecodeError:
        reason = f"FairPlay invalid JSON: {proc.stdout[:200]}"
        logger.warning("%s — game %s", reason, game.id)
        return _engine_unavailable_result(reason), reason


def persist_fairplay_report(game: Game, user, result: dict[str, Any]) -> FairPlayReport:
    report, _ = FairPlayReport.objects.update_or_create(
        game=game,
        user=user,
        defaults={
            "overall_score": float(result.get("overall_score", 0)),
            "verdict": result.get("verdict", "clean"),
            "signals_json": result.get("signals", []),
            "move_evals_json": result.get("move_evals", []),
            "engine_top1_rate": float(result.get("engine_top1_rate", 0)),
            "engine_top3_rate": float(result.get("engine_top3_rate", 0)),
            "avg_centipawn_loss": float(result.get("avg_centipawn_loss", 0)),
            "accuracy_estimate": float(result.get("accuracy_estimate", 0)),
        },
    )
    from .fairplay_review import open_review_case

    open_review_case(report)
    from .fairplay_auto_policy import maybe_apply_auto_sanction

    case = FairPlayReviewCase.objects.filter(report=report).first()
    if case:
        maybe_apply_auto_sanction(report, case)
    return report


def analyze_and_store(game: Game, user) -> FairPlayReport | None:
    from .fairplay_exempt import user_is_fairplay_exempt

    if user_is_fairplay_exempt(user):
        return None
    if game.is_vs_ai or not game.is_rated:
        return None
    result, error_reason = run_fairplay_analysis(game, user, analysis_mode="full")
    if error_reason:
        _notify_ops_engine_failure(game, user, error_reason)
        return persist_fairplay_report(game, user, result)
    baseline = player_baseline(user, game)
    if int(baseline["games_analyzed"]) >= 10:
        avg_hist = float(baseline["avg_overall_score"])
        verdict = result.get("verdict", "clean")
        score = float(result.get("overall_score", 0))
        if avg_hist < 18.0 and verdict == "suspicious" and score < 75.0:
            result["verdict"] = "review"
        if avg_hist < 12.0 and verdict == "likely_cheat" and score < 88.0:
            result["verdict"] = "suspicious"
    return persist_fairplay_report(game, user, result)


def merge_telemetry(game: Game, user, patch: dict[str, Any]) -> GameFairPlayTelemetry:
    from .fairplay_exempt import user_is_fairplay_exempt
    from .fairplay_telemetry import sanitize_telemetry_patch, user_has_fairplay_consent

    if user_is_fairplay_exempt(user):
        row, _ = GameFairPlayTelemetry.objects.get_or_create(game=game, user=user)
        return row
    if not user_has_fairplay_consent(user):
        row, _ = GameFairPlayTelemetry.objects.get_or_create(game=game, user=user)
        return row
    sanitized = sanitize_telemetry_patch(patch)
    if not sanitized:
        row, _ = GameFairPlayTelemetry.objects.get_or_create(game=game, user=user)
        return row
    patch = sanitized
    aliases = {
        "tab_blur": "tab_blur_count",
        "window_switch": "window_switch_count",
        "copy_paste": "copy_paste_events",
        "devtools": "devtools_open_count",
        "premove": "premove_count",
    }
    normalized: dict[str, Any] = {}
    for key, value in patch.items():
        normalized[aliases.get(key, key)] = value
    row, _ = GameFairPlayTelemetry.objects.get_or_create(game=game, user=user)
    data = dict(row.data or {})
    for key, value in normalized.items():
        if key in ("tab_blur_count", "window_switch_count", "copy_paste_events", "devtools_open_count", "premove_count"):
            data[key] = int(data.get(key, 0)) + int(value or 0)
        elif key == "focus_loss_ms":
            data[key] = int(data.get(key, 0)) + int(value or 0)
        elif key == "mouse_entropy":
            samples = int(data.get("mouse_samples", 0)) + 1
            prev = float(data.get("mouse_entropy", 0.0))
            new_val = float(value or 0.0)
            data["mouse_entropy"] = ((prev * (samples - 1)) + new_val) / samples if samples else new_val
            data["mouse_samples"] = samples
        else:
            data[key] = value
    row.data = data
    row.save(update_fields=["data"])
    return row


def estimate_complexity_cp(fen: str) -> int:
    """Heuristique instantanée — pas d'appel moteur sur le chemin critique du coup."""
    try:
        import chess

        board = chess.Board(fen)
        piece_vals = {
            chess.PAWN: 100,
            chess.KNIGHT: 320,
            chess.BISHOP: 330,
            chess.ROOK: 500,
            chess.QUEEN: 900,
        }
        material = 0
        for piece in board.piece_map().values():
            v = piece_vals.get(piece.piece_type, 0)
            material += v if piece.color == chess.WHITE else -v
        complexity = min(
            800,
            abs(material) // 2 + board.fullmove_number * 6 + len(list(board.legal_moves)) * 2,
        )
        if board.is_check():
            complexity += 100
        return complexity
    except Exception:
        return 0
