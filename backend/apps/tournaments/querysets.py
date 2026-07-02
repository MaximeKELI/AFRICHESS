from django.db.models import Count, Prefetch

from .models import Tournament, TournamentParticipant


def tournament_list_queryset():
    standings_qs = TournamentParticipant.objects.select_related("user", "club").order_by(
        "-score", "-wins"
    )
    return (
        Tournament.objects.select_related("created_by", "club_a", "club_b")
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
