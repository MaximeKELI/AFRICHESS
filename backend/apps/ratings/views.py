from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.countries_data import AFRICAN_COUNTRY_CODES

from .constants import PROVISIONAL_GAMES_REQUIRED
from .league_service import get_or_create_active_season, get_or_create_standing, league_standings_for_season
from .models import LeagueSeason, LeagueStanding, PlayerRating, RatingHistory
from .serializers import (
    LeaderboardEntrySerializer,
    LeagueSeasonSerializer,
    LeagueStandingSerializer,
    PlayerRatingSerializer,
    RatingHistorySerializer,
)
from .services import RatingService

User = get_user_model()


def _established_leaderboard_qs(mode: str):
    """Classement public : joueurs ayant au moins 5 parties en ligne classées."""
    return (
        PlayerRating.objects.filter(
            mode=mode,
            games_count__gte=PROVISIONAL_GAMES_REQUIRED,
        )
        .select_related("user")
        .order_by("-elo")
    )


class MyRatingsView(generics.ListAPIView):
    serializer_class = PlayerRatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PlayerRating.objects.filter(user=self.request.user).order_by("mode")


class UserRatingsView(generics.ListAPIView):
    serializer_class = PlayerRatingSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return PlayerRating.objects.filter(user__username=self.kwargs["username"])


class GlobalLeaderboardView(generics.ListAPIView):
    serializer_class = LeaderboardEntrySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        mode = self.request.query_params.get("mode", "blitz")
        return _established_leaderboard_qs(mode)[:100]


class AfricanLeaderboardView(generics.ListAPIView):
    """Leaderboard filtered by African countries."""
    serializer_class = LeaderboardEntrySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        mode = self.request.query_params.get("mode", "blitz")
        country = self.request.query_params.get("country")
        qs = _established_leaderboard_qs(mode).filter(
            user__country__in=AFRICAN_COUNTRY_CODES,
        )
        if country:
            qs = qs.filter(user__country=country)
        return qs[:100]


class CountryLeaderboardView(generics.ListAPIView):
    serializer_class = LeaderboardEntrySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        mode = self.request.query_params.get("mode", "blitz")
        country = self.kwargs["country_code"]
        return _established_leaderboard_qs(mode).filter(user__country=country)[:50]


class RatingHistoryView(generics.ListAPIView):
    serializer_class = RatingHistorySerializer

    def get_queryset(self):
        return RatingHistory.objects.filter(user=self.request.user)[:50]


@api_view(["GET"])
def rating_summary(request, username):
    user = User.objects.get(username=username)
    ratings = PlayerRating.objects.filter(user=user)
    return Response(PlayerRatingSerializer(ratings, many=True).data)


class LeagueSeasonView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        season = get_or_create_active_season()
        return Response(LeagueSeasonSerializer(season).data)


class LeagueStandingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        season = get_or_create_active_season()
        tier = request.query_params.get("tier")
        standings = league_standings_for_season(season, tier=tier or None)
        return Response(
            {
                "season": LeagueSeasonSerializer(season).data,
                "standings": LeagueStandingSerializer(standings, many=True).data,
            }
        )


class MyLeagueStandingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        season = get_or_create_active_season()
        standing = get_or_create_standing(request.user, season)
        return Response(LeagueStandingSerializer(standing).data)
