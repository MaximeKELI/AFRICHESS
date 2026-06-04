"""Contrôle du temps : optionnel, 5–30 minutes."""

ALLOWED_TIME_MINUTES = (5, 10, 15, 20, 25, 30)


def normalize_time_minutes(minutes: int | None) -> int:
    if minutes in ALLOWED_TIME_MINUTES:
        return minutes
    return 10


def resolve_time_fields(
    is_timed: bool,
    time_minutes: int | None = None,
) -> tuple[bool, int, int, int, int | None]:
    """
    Retourne (is_timed, white_ms, black_ms, increment_ms, time_control_minutes).
    Sans chrono : temps à 0, pas de pénalité au serveur.
    """
    if not is_timed:
        return False, 0, 0, 0, None
    minutes = normalize_time_minutes(time_minutes)
    ms = minutes * 60 * 1000
    return True, ms, ms, 0, minutes
