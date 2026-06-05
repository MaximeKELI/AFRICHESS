"""Agrégations pour le tableau de bord admin."""

from __future__ import annotations

from collections import Counter
from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.games.models import Game
from apps.learning.models import LearningProfile
from apps.puzzles.models import PuzzleAttempt
from apps.users.models import UserStats

from .models import UserActivityEvent

User = get_user_model()


def _since(days: int):
    return timezone.now() - timedelta(days=days)


def platform_overview() -> dict[str, Any]:
    now = timezone.now()
    since_7 = _since(7)
    since_30 = _since(30)

    users_total = User.objects.count()
    users_new_7 = User.objects.filter(date_joined__gte=since_7).count()
    users_new_30 = User.objects.filter(date_joined__gte=since_30).count()

    active_7 = (
        UserActivityEvent.objects.filter(created_at__gte=since_7, user__isnull=False)
        .values("user_id")
        .distinct()
        .count()
    )

    games_total = Game.objects.filter(status=Game.Status.COMPLETED).count()
    games_7 = Game.objects.filter(status=Game.Status.COMPLETED, ended_at__gte=since_7).count()

    events_total = UserActivityEvent.objects.count()
    clicks_7 = UserActivityEvent.objects.filter(
        event_type=UserActivityEvent.EventType.CLICK, created_at__gte=since_7
    ).count()
    page_views_7 = UserActivityEvent.objects.filter(
        event_type=UserActivityEvent.EventType.PAGE_VIEW, created_at__gte=since_7
    ).count()

    puzzles_7 = PuzzleAttempt.objects.filter(created_at__gte=since_7).count()

    signups_by_day = list(
        User.objects.filter(date_joined__gte=since_30)
        .annotate(day=TruncDate("date_joined"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )

    events_by_day = list(
        UserActivityEvent.objects.filter(created_at__gte=since_30)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            total=Count("id"),
            clicks=Count("id", filter=Q(event_type=UserActivityEvent.EventType.CLICK)),
            page_views=Count("id", filter=Q(event_type=UserActivityEvent.EventType.PAGE_VIEW)),
        )
        .order_by("day")
    )

    top_pages = list(
        UserActivityEvent.objects.filter(
            event_type=UserActivityEvent.EventType.PAGE_VIEW, created_at__gte=since_30
        )
        .values("path")
        .annotate(count=Count("id"))
        .order_by("-count")[:15]
    )

    top_clicks = list(
        UserActivityEvent.objects.filter(
            event_type=UserActivityEvent.EventType.CLICK, created_at__gte=since_30
        )
        .values("path", "element", "label")
        .annotate(count=Count("id"))
        .order_by("-count")[:20]
    )

    return {
        "generated_at": now.isoformat(),
        "users": {
            "total": users_total,
            "new_7d": users_new_7,
            "new_30d": users_new_30,
            "active_7d": active_7,
        },
        "games": {"total": games_total, "last_7d": games_7},
        "events": {
            "total": events_total,
            "clicks_7d": clicks_7,
            "page_views_7d": page_views_7,
        },
        "puzzles": {"attempts_7d": puzzles_7},
        "charts": {
            "signups_by_day": signups_by_day,
            "events_by_day": events_by_day,
        },
        "top_pages": top_pages,
        "top_clicks": top_clicks,
    }


def registration_breakdown() -> dict[str, Any]:
    by_country = list(
        User.objects.values("country")
        .annotate(count=Count("id"))
        .order_by("-count")[:30]
    )
    by_gender = list(
        User.objects.exclude(gender="")
        .values("gender")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    by_discovery = list(
        User.objects.exclude(discovery_source="")
        .values("discovery_source")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    by_locale = list(
        User.objects.exclude(registration_locale="")
        .values("registration_locale")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    by_chess_level = list(
        User.objects.values("chess_level")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    by_language = list(
        User.objects.values("preferred_language")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    return {
        "by_country": by_country,
        "by_gender": by_gender,
        "by_discovery_source": by_discovery,
        "by_registration_locale": by_locale,
        "by_chess_level": by_chess_level,
        "by_preferred_language": by_language,
    }


def user_activity_summary(user_id: int) -> dict[str, Any] | None:
    try:
        user = User.objects.select_related("stats").get(pk=user_id)
    except User.DoesNotExist:
        return None

    since_30 = _since(30)
    event_counts = dict(
        UserActivityEvent.objects.filter(user=user)
        .values("event_type")
        .annotate(c=Count("id"))
        .values_list("event_type", "c")
    )
    events_30 = UserActivityEvent.objects.filter(user=user, created_at__gte=since_30).count()
    clicks_total = event_counts.get(UserActivityEvent.EventType.CLICK, 0)
    page_views_total = event_counts.get(UserActivityEvent.EventType.PAGE_VIEW, 0)

    games = Game.objects.filter(
        Q(white_player=user) | Q(black_player=user), status=Game.Status.COMPLETED
    )
    games_total = games.count()
    puzzles = PuzzleAttempt.objects.filter(user=user).count()

    learning = None
    try:
        lp = LearningProfile.objects.get(user=user)
        learning = {
            "xp": lp.xp,
            "lessons_completed": lp.lessons_completed,
            "quizzes_passed": lp.quizzes_passed,
            "puzzle_accuracy": lp.puzzle_accuracy,
            "analyses_run": lp.analyses_run,
        }
    except LearningProfile.DoesNotExist:
        pass

    stats = None
    if hasattr(user, "stats"):
        s = user.stats
        stats = {
            "games_played": s.games_played,
            "games_won": s.games_won,
            "games_drawn": s.games_drawn,
            "games_lost": s.games_lost,
            "puzzles_solved": s.puzzles_solved,
            "best_win_streak": s.best_win_streak,
            "total_play_time_seconds": s.total_play_time_seconds,
        }

    sessions = (
        UserActivityEvent.objects.filter(user=user)
        .exclude(session_id="")
        .values("session_id")
        .distinct()
        .count()
    )

    return {
        "user": _user_admin_dict(user),
        "stats": stats,
        "learning": learning,
        "activity": {
            "events_total": sum(event_counts.values()),
            "events_30d": events_30,
            "clicks_total": clicks_total,
            "page_views_total": page_views_total,
            "sessions_estimated": sessions,
            "by_type": event_counts,
        },
        "games_total": games_total,
        "puzzle_attempts_total": puzzles,
    }


def user_timeline(user_id: int, *, limit: int = 100, offset: int = 0) -> dict[str, Any]:
    qs = UserActivityEvent.objects.filter(user_id=user_id).order_by("-created_at")
    total = qs.count()
    events = list(
        qs[offset : offset + limit].values(
            "id",
            "event_type",
            "path",
            "element",
            "label",
            "metadata",
            "session_id",
            "created_at",
        )
    )
    return {"total": total, "events": events}


def list_users_admin(*, search: str = "", limit: int = 50, offset: int = 0) -> dict[str, Any]:
    qs = User.objects.all().order_by("-date_joined")
    if search:
        qs = qs.filter(
            Q(username__icontains=search)
            | Q(email__icontains=search)
            | Q(country__icontains=search)
            | Q(city__icontains=search)
        )
    total = qs.count()
    users = []
    for u in qs[offset : offset + limit]:
        ev_count = UserActivityEvent.objects.filter(user=u).count()
        clicks = UserActivityEvent.objects.filter(
            user=u, event_type=UserActivityEvent.EventType.CLICK
        ).count()
        users.append(
            {
                **_user_admin_dict(u),
                "events_total": ev_count,
                "clicks_total": clicks,
                "games_played": getattr(getattr(u, "stats", None), "games_played", 0),
            }
        )
    return {"total": total, "users": users}


def _user_admin_dict(user) -> dict[str, Any]:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "display_name": user.display_name,
        "country": user.country,
        "city": user.city,
        "chess_level": user.chess_level,
        "gender": user.gender,
        "birth_year": user.birth_year,
        "discovery_source": user.discovery_source,
        "registration_locale": user.registration_locale,
        "preferred_language": user.preferred_language,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "is_staff": user.is_staff,
        "is_active": user.is_active,
    }
