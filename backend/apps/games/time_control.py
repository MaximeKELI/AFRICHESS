"""Contrôle du temps : sans chrono, presets (1+0, 3+2…) ou minutes legacy."""

from __future__ import annotations

from typing import TypedDict


class TimePreset(TypedDict):
    category: str
    base_ms: int
    increment_ms: int
    stat_minutes: int


TIME_PRESETS: dict[str, TimePreset] = {
    # Bullet
    "1+0": {"category": "bullet", "base_ms": 60_000, "increment_ms": 0, "stat_minutes": 1},
    "1+1": {"category": "bullet", "base_ms": 60_000, "increment_ms": 1_000, "stat_minutes": 1},
    "2+1": {"category": "bullet", "base_ms": 120_000, "increment_ms": 1_000, "stat_minutes": 2},
    # Blitz
    "3+0": {"category": "blitz", "base_ms": 180_000, "increment_ms": 0, "stat_minutes": 3},
    "3+2": {"category": "blitz", "base_ms": 180_000, "increment_ms": 2_000, "stat_minutes": 3},
    "5+0": {"category": "blitz", "base_ms": 300_000, "increment_ms": 0, "stat_minutes": 5},
    "5+3": {"category": "blitz", "base_ms": 300_000, "increment_ms": 3_000, "stat_minutes": 5},
    # Rapid
    "10+0": {"category": "rapid", "base_ms": 600_000, "increment_ms": 0, "stat_minutes": 10},
    "10+5": {"category": "rapid", "base_ms": 600_000, "increment_ms": 5_000, "stat_minutes": 10},
    "15+10": {"category": "rapid", "base_ms": 900_000, "increment_ms": 10_000, "stat_minutes": 15},
    "25+0": {"category": "rapid", "base_ms": 1_500_000, "increment_ms": 0, "stat_minutes": 25},
    # Classical
    "30+0": {"category": "classical", "base_ms": 1_800_000, "increment_ms": 0, "stat_minutes": 30},
    "30+20": {"category": "classical", "base_ms": 1_800_000, "increment_ms": 20_000, "stat_minutes": 30},
    "60+0": {"category": "classical", "base_ms": 3_600_000, "increment_ms": 0, "stat_minutes": 60},
    "90+30": {"category": "classical", "base_ms": 5_400_000, "increment_ms": 30_000, "stat_minutes": 90},
}

ALLOWED_TIME_CONTROLS = tuple(TIME_PRESETS.keys())
ALLOWED_TIME_MINUTES = (5, 10, 15, 20, 25, 30)
DEFAULT_TIME_CONTROL = "3+2"

MODE_DEFAULT_TIME_CONTROL: dict[str, str] = {
    "bullet": "1+0",
    "blitz": "3+2",
    "rapid": "10+0",
    "classical": "30+0",
}


def default_time_control_for_mode(mode: str) -> str:
    return MODE_DEFAULT_TIME_CONTROL.get(mode, DEFAULT_TIME_CONTROL)


def normalize_matchmaking_time_control(
    mode: str,
    *,
    is_timed: bool,
    is_rated: bool,
    time_minutes: int | None = None,
    time_control: str | None = None,
) -> str | None:
    """Cadence effective pour la file (ex. blitz classé → 3+2)."""
    if not is_timed:
        return None
    key = (time_control or "").strip()
    if key in TIME_PRESETS:
        return key
    if is_rated:
        return default_time_control_for_mode(mode)
    if time_minutes is not None:
        return minutes_to_preset(time_minutes)
    return DEFAULT_TIME_CONTROL


def normalize_time_minutes(minutes: int | None) -> int:
    if minutes in ALLOWED_TIME_MINUTES:
        return minutes
    return 10


def minutes_to_preset(minutes: int) -> str:
    mapping = {5: "5+0", 10: "10+0", 15: "15+10", 20: "25+0", 25: "25+0", 30: "30+0"}
    return mapping.get(minutes, DEFAULT_TIME_CONTROL)


def resolve_time_fields(
    is_timed: bool,
    time_minutes: int | None = None,
    time_control: str | None = None,
) -> tuple[bool, int, int, int, int | None]:
    """
    Retourne (is_timed, white_ms, black_ms, increment_ms, time_control_minutes).
    Sans chrono : temps à 0, pas de pénalité au serveur.
    """
    if not is_timed:
        return False, 0, 0, 0, None

    key = (time_control or "").strip()
    if key in TIME_PRESETS:
        preset = TIME_PRESETS[key]
        ms = preset["base_ms"]
        return True, ms, ms, preset["increment_ms"], preset["stat_minutes"]

    minutes = normalize_time_minutes(time_minutes)
    ms = minutes * 60 * 1000
    return True, ms, ms, 0, minutes


def category_for_time_control(time_control: str | None) -> str | None:
    key = (time_control or "").strip()
    if key in TIME_PRESETS:
        return TIME_PRESETS[key]["category"]
    return None
