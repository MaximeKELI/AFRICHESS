"""Tâches Celery — démarrage auto et fin d'arènes."""

import logging

from celery import shared_task
from django.utils import timezone

from .models import Tournament
from .services import TournamentEngine

logger = logging.getLogger(__name__)


@shared_task(queue="realtime")
def auto_start_due_tournaments():
    """Démarre les tournois en inscription/upcoming dont starts_at est passé."""
    now = timezone.now()
    qs = Tournament.objects.filter(
        status__in=(Tournament.Status.REGISTRATION, Tournament.Status.UPCOMING),
        starts_at__lte=now,
    )[:40]
    engine = TournamentEngine()
    started = 0
    for tournament in qs:
        if engine.participant_count(tournament) < 2:
            continue
        try:
            engine.start_tournament(tournament)
            started += 1
        except ValueError as exc:
            logger.info("auto_start skip %s: %s", tournament.slug, exc)
        except Exception:
            logger.exception("auto_start failed %s", tournament.slug)
    return started


@shared_task(queue="realtime")
def complete_expired_arenas():
    """Termine les arènes actives dont ends_at est dépassé."""
    now = timezone.now()
    qs = Tournament.objects.filter(
        status=Tournament.Status.ACTIVE,
        format__in=(
            Tournament.Format.ARENA,
            Tournament.Format.CLUB_ARENA,
            Tournament.Format.TEAM_BATTLE,
        ),
        ends_at__lte=now,
    )[:40]
    engine = TournamentEngine()
    done = 0
    for tournament in qs:
        if engine.maybe_complete_arena(tournament):
            done += 1
    return done
