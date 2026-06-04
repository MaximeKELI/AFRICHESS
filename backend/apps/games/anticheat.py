"""Détection basique de comportement suspect (anti-triche légère)."""

from datetime import timedelta

from django.utils import timezone

from .models import Game, Move

MAX_MOVES_PER_MINUTE = 45
MIN_MOVE_INTERVAL_MS = 80


def validate_move_timing(game: Game, user) -> dict | None:
    """Retourne {"error": ...} si suspect, None si OK."""
    if game.is_vs_ai:
        return None
    since = timezone.now() - timedelta(minutes=1)
    recent = Move.objects.filter(
        game=game, created_at__gte=since
    ).count()
    if recent >= MAX_MOVES_PER_MINUTE:
        return {"error": "Trop de coups — activité suspecte", "code": "anticheat"}
    last = game.moves.order_by("-created_at").first()
    if last:
        delta = (timezone.now() - last.created_at).total_seconds() * 1000
        if delta < MIN_MOVE_INTERVAL_MS and last.played_by_white == (
            game.white_player_id == user.id
        ):
            return {"error": "Coup trop rapide", "code": "anticheat"}
    return None
