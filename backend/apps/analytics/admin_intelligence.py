"""Admin intelligence: tables, statistiques/probabilités, data science."""

from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate, TruncWeek
from django.utils import timezone

User = get_user_model()

TABLE_NAMES = (
    "users",
    "games",
    "bots",
    "puzzles",
    "puzzle_attempts",
    "tournaments",
    "clubs",
    "forum_posts",
    "ratings",
    "notifications",
    "learning_profiles",
    "fairplay_reports",
)


def _paginate(qs, *, limit: int, offset: int) -> tuple[int, list]:
    total = qs.count()
    return total, list(qs[offset : offset + limit])


def catalog() -> dict[str, Any]:
    return {
        "tables": [
            {"id": "users", "label": "Utilisateurs"},
            {"id": "games", "label": "Parties"},
            {"id": "bots", "label": "Bots IA"},
            {"id": "puzzles", "label": "Puzzles"},
            {"id": "puzzle_attempts", "label": "Tentatives puzzles"},
            {"id": "tournaments", "label": "Tournois"},
            {"id": "clubs", "label": "Clubs"},
            {"id": "forum_posts", "label": "Forum"},
            {"id": "ratings", "label": "Classements Elo"},
            {"id": "notifications", "label": "Notifications"},
            {"id": "learning_profiles", "label": "Profils apprentissage"},
            {"id": "fairplay_reports", "label": "Rapports Fair Play"},
        ]
    }


def table_rows(name: str, *, q: str = "", limit: int = 50, offset: int = 0) -> dict[str, Any]:
    limit = min(max(limit, 1), 200)
    offset = max(offset, 0)
    q = (q or "").strip()

    if name == "users":
        from apps.analytics.services import list_users_admin

        data = list_users_admin(search=q, limit=limit, offset=offset)
        return {
            "table": name,
            "total": data["total"],
            "limit": limit,
            "offset": offset,
            "columns": [
                "id",
                "username",
                "email",
                "country",
                "is_staff",
                "is_active",
                "date_joined",
                "games_played",
                "events_total",
            ],
            "rows": [
                {
                    "id": u["id"],
                    "username": u["username"],
                    "email": u["email"],
                    "country": u["country"],
                    "is_staff": u.get("is_staff"),
                    "is_active": u.get("is_active"),
                    "date_joined": u["date_joined"],
                    "games_played": u["games_played"],
                    "events_total": u["events_total"],
                }
                for u in data["users"]
            ],
        }

    if name == "games":
        from apps.games.models import Game

        qs = Game.objects.select_related("white_player", "black_player", "bot").order_by("-created_at")
        if q:
            qs = qs.filter(
                Q(white_player__username__icontains=q)
                | Q(black_player__username__icontains=q)
                | Q(mode__icontains=q)
                | Q(status__icontains=q)
                | Q(id__icontains=q)
            )
        total, items = _paginate(qs, limit=limit, offset=offset)
        rows = [
            {
                "id": str(g.id),
                "mode": g.mode,
                "status": g.status,
                "result": g.result or "—",
                "white": g.white_player.username if g.white_player_id else None,
                "black": g.black_player.username
                if g.black_player_id
                else (g.bot.name if g.bot_id else None),
                "is_vs_ai": g.is_vs_ai,
                "is_rated": g.is_rated,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in items
        ]
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": [
                "id",
                "mode",
                "status",
                "result",
                "white",
                "black",
                "is_vs_ai",
                "is_rated",
                "created_at",
            ],
            "rows": rows,
        }

    if name == "bots":
        from apps.games.models import ChessBot

        qs = ChessBot.objects.annotate(wins=Count("victories")).order_by("-elo")
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(slug__icontains=q) | Q(tier__icontains=q))
        total, items = _paginate(qs, limit=limit, offset=offset)
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": [
                "id",
                "slug",
                "name",
                "elo",
                "tier",
                "is_active",
                "is_premium",
                "games_played",
                "wins",
            ],
            "rows": [
                {
                    "id": b.id,
                    "slug": b.slug,
                    "name": b.name,
                    "elo": b.elo,
                    "tier": b.tier,
                    "is_active": b.is_active,
                    "is_premium": b.is_premium,
                    "games_played": b.games_played,
                    "wins": b.wins,
                }
                for b in items
            ],
        }

    if name == "puzzles":
        from apps.puzzles.models import Puzzle

        qs = Puzzle.objects.order_by("-id")
        if q:
            qs = qs.filter(Q(themes__icontains=q) | Q(difficulty__icontains=q) | Q(id__icontains=q))
        total, items = _paginate(qs, limit=limit, offset=offset)
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": ["id", "difficulty", "rating", "plays_count", "success_rate", "is_daily", "themes"],
            "rows": [
                {
                    "id": p.id,
                    "difficulty": p.difficulty,
                    "rating": p.rating,
                    "plays_count": p.plays_count,
                    "success_rate": round(float(p.success_rate or 0), 3),
                    "is_daily": p.is_daily,
                    "themes": p.themes if isinstance(p.themes, list) else p.themes,
                }
                for p in items
            ],
        }

    if name == "puzzle_attempts":
        from apps.puzzles.models import PuzzleAttempt

        qs = PuzzleAttempt.objects.select_related("user", "puzzle").order_by("-created_at")
        if q:
            qs = qs.filter(Q(user__username__icontains=q))
        total, items = _paginate(qs, limit=limit, offset=offset)
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": ["id", "user", "puzzle_id", "solved", "time_seconds", "created_at"],
            "rows": [
                {
                    "id": a.id,
                    "user": a.user.username if a.user_id else None,
                    "puzzle_id": a.puzzle_id,
                    "solved": a.solved,
                    "time_seconds": a.time_seconds,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                }
                for a in items
            ],
        }

    if name == "tournaments":
        from apps.tournaments.models import Tournament

        qs = Tournament.objects.annotate(participant_count=Count("participants")).order_by("-starts_at")
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(status__icontains=q) | Q(format__icontains=q))
        total, items = _paginate(qs, limit=limit, offset=offset)
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": ["id", "name", "format", "status", "mode", "participants", "starts_at"],
            "rows": [
                {
                    "id": t.id,
                    "name": t.name,
                    "format": t.format,
                    "status": t.status,
                    "mode": t.mode,
                    "participants": t.participant_count,
                    "starts_at": t.starts_at.isoformat() if t.starts_at else None,
                }
                for t in items
            ],
        }

    if name == "clubs":
        from apps.social.models import Club

        qs = Club.objects.select_related("owner").order_by("-member_count")
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(country__icontains=q))
        total, items = _paginate(qs, limit=limit, offset=offset)
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": ["id", "name", "country", "owner", "member_count", "is_public"],
            "rows": [
                {
                    "id": c.id,
                    "name": c.name,
                    "country": c.country,
                    "owner": c.owner.username if c.owner_id else None,
                    "member_count": c.member_count,
                    "is_public": c.is_public,
                }
                for c in items
            ],
        }

    if name == "forum_posts":
        from apps.social.models import ForumPost

        qs = ForumPost.objects.select_related("author").order_by("-created_at")
        if q:
            qs = qs.filter(
                Q(title__icontains=q) | Q(category__icontains=q) | Q(author__username__icontains=q)
            )
        total, items = _paginate(qs, limit=limit, offset=offset)
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": ["id", "title", "category", "author", "likes", "created_at"],
            "rows": [
                {
                    "id": p.id,
                    "title": p.title,
                    "category": p.category,
                    "author": p.author.username if p.author_id else None,
                    "likes": getattr(p, "likes_count", 0),
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                }
                for p in items
            ],
        }

    if name == "ratings":
        from apps.ratings.models import PlayerRating

        qs = PlayerRating.objects.select_related("user").order_by("-elo")
        if q:
            qs = qs.filter(Q(user__username__icontains=q) | Q(mode__icontains=q))
        total, items = _paginate(qs, limit=limit, offset=offset)
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": ["id", "user", "mode", "elo", "peak_elo", "rd", "games_count"],
            "rows": [
                {
                    "id": r.id,
                    "user": r.user.username if r.user_id else None,
                    "mode": r.mode,
                    "elo": r.elo,
                    "peak_elo": r.peak_elo,
                    "rd": round(float(r.rd), 1),
                    "games_count": r.games_count,
                }
                for r in items
            ],
        }

    if name == "notifications":
        from apps.notifications.models import Notification

        qs = Notification.objects.select_related("user").order_by("-created_at")
        if q:
            qs = qs.filter(
                Q(type__icontains=q) | Q(title__icontains=q) | Q(user__username__icontains=q)
            )
        total, items = _paginate(qs, limit=limit, offset=offset)
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": ["id", "user", "type", "title", "is_read", "created_at"],
            "rows": [
                {
                    "id": n.id,
                    "user": n.user.username if n.user_id else None,
                    "type": n.type,
                    "title": n.title,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat() if n.created_at else None,
                }
                for n in items
            ],
        }

    if name == "learning_profiles":
        from apps.learning.models import LearningProfile

        qs = LearningProfile.objects.select_related("user").order_by("-xp")
        if q:
            qs = qs.filter(user__username__icontains=q)
        total, items = _paginate(qs, limit=limit, offset=offset)
        fields = {f.name for f in LearningProfile._meta.get_fields()}
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": ["id", "user", "xp", "lessons_completed", "quizzes_passed"],
            "rows": [
                {
                    "id": p.id,
                    "user": p.user.username if p.user_id else None,
                    "xp": p.xp,
                    "lessons_completed": getattr(p, "lessons_completed", None)
                    if "lessons_completed" in fields
                    else None,
                    "quizzes_passed": getattr(p, "quizzes_passed", None)
                    if "quizzes_passed" in fields
                    else None,
                }
                for p in items
            ],
        }

    if name == "fairplay_reports":
        from apps.games.models import FairPlayReport

        qs = FairPlayReport.objects.select_related("user", "game").order_by("-analyzed_at")
        if q:
            qs = qs.filter(Q(user__username__icontains=q) | Q(verdict__icontains=q))
        total, items = _paginate(qs, limit=limit, offset=offset)
        return {
            "table": name,
            "total": total,
            "limit": limit,
            "offset": offset,
            "columns": ["id", "user", "game_id", "verdict", "overall_score", "created_at"],
            "rows": [
                {
                    "id": r.id,
                    "user": r.user.username if r.user_id else None,
                    "game_id": str(r.game_id) if r.game_id else None,
                    "verdict": r.verdict,
                    "overall_score": round(float(r.overall_score or 0), 2),
                    "created_at": r.analyzed_at.isoformat() if r.analyzed_at else None,
                }
                for r in items
            ],
        }

    raise ValueError(f"Unknown table: {name}")


def _rate(num: int, den: int) -> float:
    if den <= 0:
        return 0.0
    return round(num / den, 4)


def _histogram(
    values: list[int], *, bin_size: int = 100, min_v: int = 600, max_v: int = 2800
) -> list[dict]:
    buckets: dict[int, int] = defaultdict(int)
    for v in values:
        clamped = min(max(int(v), min_v), max_v)
        key = (clamped // bin_size) * bin_size
        buckets[key] += 1
    return [{"elo_from": k, "elo_to": k + bin_size - 1, "count": buckets[k]} for k in sorted(buckets)]


def statistics_and_probability(*, days: int = 30) -> dict[str, Any]:
    from apps.games.models import FairPlayReport, Game
    from apps.puzzles.models import PuzzleAttempt
    from apps.ratings.models import PlayerRating

    days = min(max(days, 1), 365)
    since = timezone.now() - timedelta(days=days)

    games = Game.objects.filter(created_at__gte=since)
    total_games = games.count()
    completed = games.filter(status=Game.Status.COMPLETED).count()
    aborted = games.filter(status=Game.Status.ABORTED).count()
    draws = games.filter(result=Game.Result.DRAW).count()
    white_wins = games.filter(result=Game.Result.WHITE_WIN).count()
    black_wins = games.filter(result=Game.Result.BLACK_WIN).count()
    decided = white_wins + black_wins + draws

    by_mode = list(games.values("mode").annotate(count=Count("id")).order_by("-count"))
    by_status = list(games.values("status").annotate(count=Count("id")).order_by("-count"))
    vs_ai = games.filter(is_vs_ai=True).count()
    pvp = total_games - vs_ai

    attempts = PuzzleAttempt.objects.filter(created_at__gte=since)
    attempt_total = attempts.count()
    attempt_solved = attempts.filter(solved=True).count()

    ratings = list(PlayerRating.objects.filter(mode="blitz").values_list("elo", flat=True))
    elo_sorted = sorted(ratings)
    n = len(elo_sorted)

    def percentile(p: float) -> int | None:
        if not elo_sorted:
            return None
        idx = min(n - 1, max(0, int(round((p / 100) * (n - 1)))))
        return elo_sorted[idx]

    users_total = User.objects.filter(is_active=True).count()
    joined = User.objects.filter(date_joined__gte=since).count()
    logged_7d = User.objects.filter(last_login__gte=timezone.now() - timedelta(days=7)).count()

    fp = FairPlayReport.objects.filter(analyzed_at__gte=since)
    fp_total = fp.count()
    fp_by_verdict = {r["verdict"]: r["count"] for r in fp.values("verdict").annotate(count=Count("id"))}

    return {
        "window_days": days,
        "generated_at": timezone.now().isoformat(),
        "games": {
            "total": total_games,
            "completed": completed,
            "aborted": aborted,
            "p_completed": _rate(completed, total_games),
            "p_aborted": _rate(aborted, total_games),
            "white_wins": white_wins,
            "black_wins": black_wins,
            "draws": draws,
            "p_white_win": _rate(white_wins, decided),
            "p_black_win": _rate(black_wins, decided),
            "p_draw": _rate(draws, decided),
            "vs_ai": vs_ai,
            "pvp": pvp,
            "p_vs_ai": _rate(vs_ai, total_games),
            "by_mode": by_mode,
            "by_status": by_status,
        },
        "puzzles": {
            "attempts": attempt_total,
            "solved": attempt_solved,
            "p_solve": _rate(attempt_solved, attempt_total),
            "avg_time_seconds": round(
                float(attempts.aggregate(a=Avg("time_seconds"))["a"] or 0),
                2,
            ),
        },
        "ratings": {
            "mode": "blitz",
            "sample": n,
            "mean": round(sum(elo_sorted) / n, 1) if n else None,
            "p50": percentile(50),
            "p90": percentile(90),
            "p99": percentile(99),
            "histogram": _histogram(elo_sorted),
        },
        "users": {
            "active_accounts": users_total,
            "new_in_window": joined,
            "logged_in_7d": logged_7d,
            "p_logged_in_7d": _rate(logged_7d, users_total),
        },
        "fairplay": {
            "reports": fp_total,
            "by_verdict": fp_by_verdict,
            "p_likely_cheat": _rate(fp_by_verdict.get("likely_cheat", 0), fp_total),
        },
    }


def data_science_report(*, days: int = 60) -> dict[str, Any]:
    from apps.analytics.models import UserActivityEvent
    from apps.games.models import Game
    from apps.puzzles.models import PuzzleAttempt

    days = min(max(days, 7), 180)
    since = timezone.now() - timedelta(days=days)

    cohorts_qs = (
        User.objects.filter(date_joined__gte=since)
        .annotate(week=TruncWeek("date_joined"))
        .values("week")
        .annotate(signups=Count("id"))
        .order_by("week")
    )
    cohorts = []
    for row in cohorts_qs:
        week = row["week"]
        if not week:
            continue
        week_end = week + timedelta(days=7)
        signups = row["signups"]
        user_ids = list(
            User.objects.filter(date_joined__gte=week, date_joined__lt=week_end).values_list(
                "id", flat=True
            )
        )
        activated = Game.objects.filter(
            Q(white_player_id__in=user_ids) | Q(black_player_id__in=user_ids),
            created_at__gte=week,
        ).values("white_player_id", "black_player_id")
        played_ids: set[int] = set()
        for g in activated.iterator(chunk_size=500):
            if g["white_player_id"] in user_ids:
                played_ids.add(g["white_player_id"])
            if g["black_player_id"] in user_ids:
                played_ids.add(g["black_player_id"])
        cohorts.append(
            {
                "week": week.date().isoformat(),
                "signups": signups,
                "played_game": len(played_ids),
                "activation_rate": _rate(len(played_ids), signups),
            }
        )

    registered = User.objects.filter(date_joined__gte=since).count()
    played = (
        User.objects.filter(date_joined__gte=since)
        .filter(Q(games_as_white__isnull=False) | Q(games_as_black__isnull=False))
        .distinct()
        .count()
    )
    puzzled = (
        User.objects.filter(date_joined__gte=since, puzzleattempt__isnull=False).distinct().count()
    )
    lesson_users = (
        UserActivityEvent.objects.filter(
            created_at__gte=since,
            event_type__in=["lesson_complete", "lesson_start", "learning_open"],
            user_id__isnull=False,
        )
        .values("user_id")
        .distinct()
        .count()
    )
    funnel = [
        {"step": "registered", "count": registered, "rate_from_start": 1.0},
        {
            "step": "first_game",
            "count": played,
            "rate_from_start": _rate(played, registered),
            "rate_from_prev": _rate(played, registered),
        },
        {
            "step": "first_puzzle",
            "count": puzzled,
            "rate_from_start": _rate(puzzled, registered),
            "rate_from_prev": _rate(puzzled, played),
        },
        {
            "step": "learning_touch",
            "count": lesson_users,
            "rate_from_start": _rate(lesson_users, registered),
            "rate_from_prev": _rate(lesson_users, puzzled),
        },
    ]

    def retention_fast(day: int) -> dict[str, Any]:
        join_end = timezone.now() - timedelta(days=day)
        cohort_ids = list(
            User.objects.filter(date_joined__gte=since, date_joined__lte=join_end).values_list(
                "id", flat=True
            )[:800]
        )
        size = len(cohort_ids)
        if size == 0:
            return {"day": day, "cohort_size": 0, "retained": 0, "rate": 0.0}
        retained_ids: set[int] = set()
        for uid in cohort_ids:
            u = User.objects.filter(pk=uid).only("date_joined", "last_login").first()
            if not u:
                continue
            threshold = u.date_joined + timedelta(days=day)
            if u.last_login and u.last_login >= threshold:
                retained_ids.add(uid)
                continue
            if Game.objects.filter(
                Q(white_player_id=uid) | Q(black_player_id=uid),
                created_at__gte=threshold,
            ).exists():
                retained_ids.add(uid)
        return {
            "day": day,
            "cohort_size": size,
            "retained": len(retained_ids),
            "rate": _rate(len(retained_ids), size),
            "note": "proxy: last_login or game after join+Dn (sample ≤800)",
        }

    by_level = list(
        User.objects.exclude(chess_level="")
        .values("chess_level")
        .annotate(users=Count("id"), avg_games=Avg("stats__games_played"))
        .order_by("-users")[:12]
    )
    by_discovery = list(
        User.objects.exclude(discovery_source="")
        .values("discovery_source")
        .annotate(users=Count("id"), avg_games=Avg("stats__games_played"))
        .order_by("-users")[:12]
    )
    by_country = list(
        User.objects.exclude(country="")
        .values("country")
        .annotate(users=Count("id"), avg_games=Avg("stats__games_played"))
        .order_by("-users")[:15]
    )

    daily = list(
        UserActivityEvent.objects.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(events=Count("id"), users=Count("user_id", distinct=True))
        .order_by("day")
    )

    puzzle_by_diff = list(
        PuzzleAttempt.objects.filter(created_at__gte=since)
        .values("puzzle__difficulty")
        .annotate(attempts=Count("id"), solved=Count("id", filter=Q(solved=True)))
        .order_by("puzzle__difficulty")
    )
    for row in puzzle_by_diff:
        row["p_solve"] = _rate(row["solved"], row["attempts"])
        row["difficulty"] = row.pop("puzzle__difficulty") or "—"

    return {
        "window_days": days,
        "generated_at": timezone.now().isoformat(),
        "cohorts": cohorts,
        "funnel": funnel,
        "retention": [retention_fast(1), retention_fast(7), retention_fast(30)],
        "correlations": {
            "chess_level_vs_games": by_level,
            "discovery_vs_games": by_discovery,
            "country_vs_games": by_country,
        },
        "activity_daily": [
            {
                "day": r["day"].isoformat() if r["day"] else None,
                "events": r["events"],
                "users": r["users"],
            }
            for r in daily
        ],
        "puzzle_difficulty": puzzle_by_diff,
    }


def update_user_powers(*, actor, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    """Staff powers: activate/deactivate, fairplay exempt, subscription; superuser for staff flags."""
    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist as exc:
        raise LookupError("user_not_found") from exc

    allowed = {"is_active", "fairplay_exempt", "subscription_tier"}
    if getattr(actor, "is_superuser", False):
        allowed |= {"is_staff", "is_superuser"}

    if target.pk == actor.pk and payload.get("is_active") is False:
        raise PermissionError("cannot_deactivate_self")
    if target.pk == actor.pk and payload.get("is_superuser") is False:
        raise PermissionError("cannot_remove_own_superuser")

    changed: dict[str, Any] = {}
    for key in allowed:
        if key not in payload:
            continue
        val = payload[key]
        if key == "subscription_tier":
            valid = {c[0] for c in User.SubscriptionTier.choices}
            if val not in valid:
                raise ValueError("invalid_subscription_tier")
        setattr(target, key, val)
        changed[key] = val

    if not changed:
        raise ValueError("no_valid_fields")

    target.save(update_fields=list(changed.keys()))
    return {
        "id": target.id,
        "username": target.username,
        "updated": changed,
        "user": {
            "id": target.id,
            "username": target.username,
            "email": target.email,
            "is_active": target.is_active,
            "is_staff": target.is_staff,
            "is_superuser": target.is_superuser,
            "fairplay_exempt": target.fairplay_exempt,
            "subscription_tier": target.subscription_tier,
        },
    }
