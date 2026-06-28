#!/usr/bin/env python3
"""Lance toutes les simulations Fair Play C++ et affiche un rapport."""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow running from repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from apps.games.tests.fairplay_helpers import (  # noqa: E402
    alternating_moves,
    base_payload,
    baseline_payload,
    cpp_available,
    run_fairplay_cpp,
    signal_codes,
)

SCENARIOS = [
    ("clean_casual", base_payload(moves=alternating_moves(15)), {"verdict": "clean"}),
    (
        "strong_baseline",
        base_payload(
            player_elo=2500,
            baseline=baseline_payload(games=15, top1=0.55),
            moves=alternating_moves(18, white_think_ms=3200),
        ),
        {"verdict_not": "likely_cheat"},
    ),
    (
        "instant_complex",
        base_payload(
            moves=alternating_moves(8, white_think_ms=100, white_complexity=350),
        ),
        {"signals_contain": "INSTANT_COMPLEX"},
    ),
    (
        "copy_paste",
        base_payload(moves=alternating_moves(6), telemetry={"copy_paste_events": 4}),
        {"signals_contain": "COPY_PASTE"},
    ),
    (
        "combined_bot",
        base_payload(
            player_elo=900,
            moves=alternating_moves(10, white_think_ms=100, white_complexity=320),
            telemetry={"copy_paste_events": 5, "devtools_open_count": 2},
        ),
        {"verdict_in": ("review", "suspicious", "likely_cheat"), "min_signals": 2},
    ),
]


def check_expectations(name: str, result: dict, expect: dict) -> list[str]:
    errors: list[str] = []
    if "verdict" in expect and result["verdict"] != expect["verdict"]:
        errors.append(f"{name}: verdict={result['verdict']} expected {expect['verdict']}")
    if "verdict_not" in expect and result["verdict"] == expect["verdict_not"]:
        errors.append(f"{name}: unexpected verdict {result['verdict']}")
    if "verdict_in" in expect and result["verdict"] not in expect["verdict_in"]:
        errors.append(f"{name}: verdict {result['verdict']} not in {expect['verdict_in']}")
    if "signals_contain" in expect:
        code = expect["signals_contain"]
        if code not in signal_codes(result):
            errors.append(f"{name}: missing signal {code}")
    if "min_signals" in expect and len(result.get("signals", [])) < expect["min_signals"]:
        errors.append(f"{name}: too few signals")
    return errors


def main() -> int:
    if not cpp_available():
        print("ERROR: fairplay binary not built (anticheat-cpp/build)")
        return 1
    all_errors: list[str] = []
    print(f"{'SCENARIO':<20} {'VERDICT':<14} {'SCORE':>6}  SIGNALS")
    print("-" * 70)
    for name, payload, expect in SCENARIOS:
        result = run_fairplay_cpp(payload)
        codes = ", ".join(sorted(signal_codes(result))) or "—"
        print(
            f"{name:<20} {result['verdict']:<14} {result['overall_score']:>6.1f}  {codes}"
        )
        all_errors.extend(check_expectations(name, result, expect))
    print("-" * 70)
    if all_errors:
        print("FAILURES:")
        for e in all_errors:
            print(f"  - {e}")
        return 1
    print("All simulations passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
