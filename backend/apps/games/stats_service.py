"""Enregistrement et agrégation des statistiques de parties."""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Any

from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.ratings.models import PlayerRating, RatingHistory

from .models import Game, GameAnalysis

OPENING_LINES: dict[str, str] = {
    "e4": "Ouverture du roi",
    "e4 e5": "Partie ouverte",
    "e4 c5": "Défense sicilienne",
    "e4 e6": "Défense française",
    "e4 c6": "Défense caro-kann",
    "d4": "Ouverture de la dame",
    "d4 d5": "Gambit de la dame refusé",
    "d4 Nf6": "Défense indienne",
    "d4 f5": "Défense hollandaise",
    "Nf3": "Ouverture Réti",
    "c4": "Ouverture anglaise",
    "e4 Nf6": "Défense alekhine",
    "e4 d5": "Scandinave",
}


def _san_key(san: str) -> str:
    return san.replace("+", "").replace("#", "").strip()[:5]


def opening_from_moves(sans: list[str]) -> str:
    if not sans:
        return "Position initiale"
    white_moves = [sans[i] for i in range(0, len(sans), 2)]
    w0 = _san_key(white_moves[0]) if white_moves else ""
    b0 = _san_key(sans[1]) if len(sans) > 1 else ""
    two = f"{w0} {b0}".strip()
    if two in OPENING_LINES:
        return OPENING_LINES[two]
    if w0 in OPENING_LINES:
        return OPENING_LINES[w0]
    if w0.startswith("e4") and b0.startswith("e5"):
        return "Partie ouverte"
    if w0.startswith("d4") and "Nf" in b0:
        return "Défense indienne"
    return f"Après {white_moves[0]}" if white_moves else "Milieu de partie"


def effective_cadence(game: Game) -> str:
    """Cadence affichée (bullet/blitz/rapid/classical) même pour parties IA."""
    if not game.is_vs_ai and game.mode != Game.Mode.AI:
        m = game.mode
        if m in ("bullet", "blitz", "rapid", "classical"):
            return m
    tcm = game.time_control_minutes
    if tcm is None:
        return "blitz"
    if tcm <= 2:
        return "bullet"
    if tcm <= 5:
        return "blitz"
    if tcm <= 15:
        return "rapid"
    return "classical"


def _outcome_for_user(game: Game, user_id: int) -> str:
    if game.result in (Game.Result.DRAW, "1/2-1/2"):
        return "draw"
    if not game.result or game.result == Game.Result.ABORTED:
        return "other"
    user_is_white = game.white_player_id == user_id
    white_won = game.result == Game.Result.WHITE_WIN
    if (white_won and user_is_white) or (not white_won and not user_is_white):
        return "win"
    return "loss"


def _play_duration_seconds(game: Game) -> int:
    if game.started_at and game.ended_at:
        return max(0, int((game.ended_at - game.started_at).total_seconds()))
    return 0


def _update_user_stats_row(stats, outcome: str, duration: int) -> None:
    stats.games_played += 1
    if outcome == "win":
        stats.games_won += 1
        stats.current_streak = max(0, stats.current_streak) + 1
        stats.best_win_streak = max(stats.best_win_streak, stats.current_streak)
    elif outcome == "draw":
        stats.games_drawn += 1
        stats.current_streak = 0
    elif outcome == "loss":
        stats.games_lost += 1
        stats.current_streak = min(0, stats.current_streak) - 1
    stats.total_play_time_seconds += duration


def record_game_stats(game: Game) -> None:
    """Met à jour UserStats pour chaque joueur humain (idempotent)."""
    if game.status != Game.Status.COMPLETED or game.stats_recorded:
        return

    from apps.users.models import UserStats

    duration = _play_duration_seconds(game)
    players: list[int] = []
    if game.white_player_id:
        players.append(game.white_player_id)
    if game.black_player_id:
        players.append(game.black_player_id)

    for uid in players:
        stats, _ = UserStats.objects.get_or_create(user_id=uid)
        outcome = _outcome_for_user(game, uid)
        _update_user_stats_row(stats, outcome, duration)
        stats.save()

    game.stats_recorded = True
    game.save(update_fields=["stats_recorded"])


def on_game_completed(game: Game) -> None:
    record_game_stats(game)
    try:
        from apps.ratings.league_service import record_league_result

        for player in (game.white_player, game.black_player):
            if player and not game.is_vs_ai:
                outcome = _outcome_for_user(game, player.id)
                if outcome in ("win", "draw", "loss"):
                    record_league_result(player, outcome)
    except Exception:
        pass
    try:
        from apps.analytics.events import log_event

        for player in (game.white_player, game.black_player):
            if player:
                log_event(
                    "game_end",
                    user=player,
                    path=f"/play/game/{game.id}",
                    metadata={
                        "game_id": str(game.id),
                        "mode": game.mode,
                        "is_vs_ai": game.is_vs_ai,
                        "result": game.result,
                    },
                )
    except Exception:
        pass


def _result_counts(games_qs, user_id: int) -> dict[str, Any]:
    played = 0
    won = drawn = lost = 0
    for g in games_qs.iterator():
        played += 1
        o = _outcome_for_user(g, user_id)
        if o == "win":
            won += 1
        elif o == "draw":
            drawn += 1
        elif o == "loss":
            lost += 1
    wr = round((won / played) * 100, 1) if played else 0.0
    return {
        "played": played,
        "won": won,
        "drawn": drawn,
        "lost": lost,
        "win_rate": wr,
    }


def user_games_qs(user):
    return (
        Game.objects.filter(
            status=Game.Status.COMPLETED,
        )
        .filter(Q(white_player=user) | Q(black_player=user))
        .select_related("white_player", "black_player")
        .prefetch_related("moves", "analysis")
    )


def build_user_stats_payload(user) -> dict[str, Any]:
    qs = user_games_qs(user)
    user_id = user.id

    summary_src = getattr(user, "stats", None)
    agg_played = agg_won = agg_drawn = agg_lost = 0
    total_seconds = 0

    by_mode: dict[str, dict] = defaultdict(
        lambda: {"played": 0, "won": 0, "drawn": 0, "lost": 0, "win_rate": 0.0}
    )
    vs_opponent = {
        "human": {"played": 0, "won": 0, "drawn": 0, "lost": 0, "win_rate": 0.0},
        "ai": {"played": 0, "won": 0, "drawn": 0, "lost": 0, "win_rate": 0.0},
    }
    by_color = {
        "white": {"played": 0, "won": 0, "drawn": 0, "lost": 0, "win_rate": 0.0},
        "black": {"played": 0, "won": 0, "drawn": 0, "lost": 0, "win_rate": 0.0},
    }
    by_termination: dict[str, int] = defaultdict(int)
    openings: dict[str, dict] = defaultdict(lambda: {"played": 0, "won": 0})
    activity: dict[str, int] = defaultdict(int)
    ai_elos_beaten: list[int] = []

    for g in qs:
        outcome = _outcome_for_user(g, user_id)
        agg_played += 1
        total_seconds += _play_duration_seconds(g)
        if outcome == "win":
            agg_won += 1
        elif outcome == "draw":
            agg_drawn += 1
        elif outcome == "loss":
            agg_lost += 1
        cadence = effective_cadence(g)
        bucket = by_mode[cadence]
        bucket["played"] += 1
        if outcome == "win":
            bucket["won"] += 1
        elif outcome == "draw":
            bucket["drawn"] += 1
        elif outcome == "loss":
            bucket["lost"] += 1

        opp_key = "ai" if g.is_vs_ai else "human"
        ob = vs_opponent[opp_key]
        ob["played"] += 1
        if outcome == "win":
            ob["won"] += 1
            if g.is_vs_ai and g.ai_target_elo:
                ai_elos_beaten.append(g.ai_target_elo)
        elif outcome == "draw":
            ob["drawn"] += 1
        elif outcome == "loss":
            ob["lost"] += 1

        color_key = "white" if g.white_player_id == user_id else "black"
        cb = by_color[color_key]
        cb["played"] += 1
        if outcome == "win":
            cb["won"] += 1
        elif outcome == "draw":
            cb["drawn"] += 1
        elif outcome == "loss":
            cb["lost"] += 1

        if g.termination_reason:
            by_termination[g.termination_reason] += 1
        elif g.result in (Game.Result.WHITE_WIN, Game.Result.BLACK_WIN):
            by_termination["checkmate"] += 1
        else:
            by_termination["other"] += 1

        if g.ended_at:
            activity[g.ended_at.date().isoformat()] += 1

        sans = [m.san for m in g.moves.all()]
        oname = opening_from_moves(sans)
        obk = openings[oname]
        obk["played"] += 1
        if outcome == "win":
            obk["won"] += 1

    for bucket in list(by_mode.values()) + list(vs_opponent.values()) + list(by_color.values()):
        p = bucket["played"]
        bucket["win_rate"] = round((bucket["won"] / p) * 100, 1) if p else 0.0

    openings_list = sorted(
        [
            {
                "name": name,
                "played": data["played"],
                "won": data["won"],
                "win_rate": round((data["won"] / data["played"]) * 100, 1)
                if data["played"]
                else 0.0,
            }
            for name, data in openings.items()
        ],
        key=lambda x: x["played"],
        reverse=True,
    )[:12]

    recent = []
    for g in qs.order_by("-ended_at", "-created_at")[:20]:
        sans = [m.san for m in g.moves.all()]
        if g.is_vs_ai:
            opponent = f"IA ~{g.ai_target_elo}" if g.ai_target_elo else "IA"
        else:
            opp = g.black_player if g.white_player_id == user_id else g.white_player
            opponent = (opp.display_name if opp else None) or (opp.username if opp else "Adversaire")
        o = _outcome_for_user(g, user_id)
        recent.append(
            {
                "id": str(g.id),
                "result": g.result,
                "outcome": o,
                "mode": effective_cadence(g),
                "is_vs_ai": g.is_vs_ai,
                "opponent": opponent,
                "opening": opening_from_moves(sans),
                "move_count": g.move_count,
                "termination": g.termination_reason or "",
                "date": g.ended_at.isoformat() if g.ended_at else g.created_at.isoformat(),
            }
        )

    ratings = list(
        PlayerRating.objects.filter(user=user).order_by("mode").values(
            "mode", "elo", "peak_elo", "games_count"
        )
    )

    rating_history = list(
        RatingHistory.objects.filter(user=user)
        .order_by("-created_at")[:40]
        .values("mode", "elo_before", "elo_after", "change", "created_at")
    )

    today = timezone.now().date()
    activity_series = []
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        activity_series.append({"date": d, "games": activity.get(d, 0)})

    game_ids = list(qs.values_list("id", flat=True))
    analyses = GameAnalysis.objects.filter(game_id__in=game_ids)
    games_analyzed = analyses.count()

    user_analyses = []
    for a in analyses.select_related("game")[:50]:
        g = a.game
        if not g:
            continue
        is_white = g.white_player_id == user_id
        acc = a.accuracy_white if is_white else a.accuracy_black
        bl = a.blunders_white if is_white else a.blunders_black
        if acc is not None:
            user_analyses.append({"accuracy": acc, "blunders": bl or 0})

    avg_accuracy = None
    avg_blunders = None
    if user_analyses:
        avg_accuracy = round(
            sum(x["accuracy"] for x in user_analyses if x["accuracy"]) / len(user_analyses), 1
        )
        avg_blunders = round(
            sum(x["blunders"] for x in user_analyses) / len(user_analyses), 1
        )

    summary = {
        "games_played": agg_played,
        "games_won": agg_won,
        "games_drawn": agg_drawn,
        "games_lost": agg_lost,
        "win_rate": round((agg_won / agg_played) * 100, 1) if agg_played else 0.0,
        "current_streak": summary_src.current_streak if summary_src else 0,
        "best_win_streak": summary_src.best_win_streak if summary_src else 0,
        "total_play_time_hours": round(total_seconds / 3600, 1),
        "puzzles_solved": summary_src.puzzles_solved if summary_src else 0,
    }

    return {
        "summary": summary,
        "by_mode": [
            {"mode": m, **by_mode[m]}
            for m in ("bullet", "blitz", "rapid", "classical")
            if by_mode[m]["played"] > 0
        ],
        "vs_opponent": vs_opponent,
        "by_color": by_color,
        "by_termination": dict(by_termination),
        "openings": openings_list,
        "recent_form": recent,
        "ratings": ratings,
        "rating_history": rating_history,
        "activity": activity_series,
        "analysis": {
            "games_analyzed": games_analyzed,
            "avg_accuracy": avg_accuracy,
            "avg_blunders": avg_blunders,
        },
        "ai_stats": {
            "games_vs_ai": vs_opponent["ai"]["played"],
            "avg_ai_elo_beaten": round(sum(ai_elos_beaten) / len(ai_elos_beaten))
            if ai_elos_beaten
            else None,
            "best_ai_elo_beaten": max(ai_elos_beaten) if ai_elos_beaten else None,
        },
    }
