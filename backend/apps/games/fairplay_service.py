"""Orchestration anti-triche — binaire C++ fairplay + fallback Python."""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
from typing import Any

from django.conf import settings

from apps.ratings.models import PlayerRating

from .models import FairPlayReport, Game, GameFairPlayTelemetry, Move

logger = logging.getLogger(__name__)


def _fairplay_bin() -> str | None:
    candidates = [
        getattr(settings, "FAIRPLAY_BIN", ""),
        "/usr/local/bin/africhess-fairplay",
    ]
    for path in candidates:
        if path and shutil.which(path):
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


def run_fairplay_analysis(game: Game, user, *, analysis_mode: str = "full") -> dict[str, Any] | None:
    payload = build_game_input(game, user, analysis_mode=analysis_mode)
    binary = _fairplay_bin()
    if not binary:
        logger.warning("FairPlay binary unavailable — skipping analysis for game %s", game.id)
        return None
    try:
        proc = subprocess.run(
            [binary],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=getattr(settings, "FAIRPLAY_TIMEOUT", 120),
            check=False,
        )
    except (subprocess.TimeoutExpired, OSError) as exc:
        logger.exception("FairPlay subprocess failed: %s", exc)
        return None
    if proc.returncode != 0 or not proc.stdout.strip():
        logger.warning(
            "FairPlay error game=%s rc=%s stderr=%s",
            game.id,
            proc.returncode,
            (proc.stderr or "")[:300],
        )
        return None
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        logger.warning("FairPlay invalid JSON: %s", proc.stdout[:200])
        return None


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
    return report


def analyze_and_store(game: Game, user) -> FairPlayReport | None:
    if game.is_vs_ai or not game.is_rated:
        return None
    result = run_fairplay_analysis(game, user, analysis_mode="full")
    if not result:
        return None
    return persist_fairplay_report(game, user, result)


def merge_telemetry(game: Game, user, patch: dict[str, Any]) -> GameFairPlayTelemetry:
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
