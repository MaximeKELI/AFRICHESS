"""Utilitaires partagés — tests Fair Play et simulations C++."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[4]


def fairplay_binary_path() -> str | None:
    candidates = [
        os.environ.get("FAIRPLAY_BIN"),
        str(REPO_ROOT / "anticheat-cpp/build/africhess-fairplay"),
        "/usr/local/bin/africhess-fairplay",
    ]
    for path in candidates:
        if path and (shutil.which(path) or os.path.isfile(path)):
            return path
    return None


def run_fairplay_cpp(payload: dict[str, Any], *, timeout: int = 30) -> dict[str, Any]:
    binary = fairplay_binary_path()
    if not binary:
        raise RuntimeError("fairplay binary not built")
    proc = subprocess.run(
        [binary],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"fairplay rc={proc.returncode} stderr={proc.stderr[:500]}")
    return json.loads(proc.stdout)


def cpp_available() -> bool:
    return fairplay_binary_path() is not None


def baseline_payload(
    games: int = 10,
    top1: float = 0.48,
    accuracy: float = 89.0,
    cpl: float = 32.0,
    score: float = 8.0,
) -> dict[str, float | int]:
    return {
        "games_analyzed": games,
        "avg_accuracy": accuracy,
        "avg_top1_rate": top1,
        "avg_cpl": cpl,
        "avg_overall_score": score,
    }


def alternating_moves(
    n_pairs: int,
    *,
    white_think_ms: int = 2500,
    black_think_ms: int = 2500,
    white_complexity: int = 80,
    black_complexity: int = 80,
    white_uci: str = "e2e4",
    black_uci: str = "e7e5",
) -> list[dict[str, Any]]:
    moves: list[dict[str, Any]] = []
    num = 1
    for _ in range(n_pairs):
        moves.append(
            {
                "uci": white_uci,
                "san": "e4",
                "played_by_white": True,
                "move_number": num,
                "think_ms": white_think_ms,
                "complexity_cp": white_complexity,
            }
        )
        num += 1
        moves.append(
            {
                "uci": black_uci,
                "san": "e5",
                "played_by_white": False,
                "move_number": num,
                "think_ms": black_think_ms,
                "complexity_cp": black_complexity,
            }
        )
        num += 1
    return moves


def player_only_moves(
    n: int,
    *,
    think_ms: int = 2500,
    complexity_cp: int = 80,
    played_by_white: bool = True,
) -> list[dict[str, Any]]:
    moves = []
    for i in range(n):
        is_white = played_by_white if i % 2 == 0 else not played_by_white
        if is_white:
            uci, san = "e2e4", "e4"
        else:
            uci, san = "e7e5", "e5"
        moves.append(
            {
                "uci": uci,
                "san": san,
                "played_by_white": is_white,
                "move_number": i + 1,
                "think_ms": think_ms if is_white == played_by_white else 2000,
                "complexity_cp": complexity_cp if is_white == played_by_white else 60,
            }
        )
    return moves


def base_payload(
    *,
    game_id: str = "sim",
    player_elo: int = 1400,
    player_is_white: bool = True,
    mode: str = "blitz",
    analysis_mode: str = "realtime",
    baseline: dict | None = None,
    telemetry: dict | None = None,
    moves: list[dict] | None = None,
) -> dict[str, Any]:
    return {
        "game_id": game_id,
        "player_elo": player_elo,
        "player_is_white": player_is_white,
        "mode": mode,
        "is_rated": True,
        "analysis_mode": analysis_mode,
        "baseline": baseline or {"games_analyzed": 0},
        "telemetry": telemetry or {},
        "moves": moves or [],
    }


def signal_codes(result: dict[str, Any]) -> set[str]:
    return {s["code"] for s in result.get("signals", [])}
