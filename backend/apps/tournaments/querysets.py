from django.db.models import Count, Prefetch

from .models import Tournament, TournamentParticipant


def _standings_prefetch():
    return TournamentParticipant.objects.select_related(
        "user", "user__stats", "club"
    ).order_by("-score", "-wins")


def tournament_list_queryset():
    standings_qs = _standings_prefetch()
    return (
        Tournament.objects.select_related(
            "created_by", "created_by__stats", "club_a", "club_b"
        )
        .annotate(participant_count=Count("standings", distinct=True))
        .prefetch_related(
            Prefetch(
                "standings",
                queryset=standings_qs[:20],
                to_attr="top_standings",
            )
        )
    )


def tournament_detail_queryset():
    return tournament_list_queryset()
