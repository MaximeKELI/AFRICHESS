from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import PlayerRating, RatingHistory
from .serializers import LeaderboardEntrySerializer, PlayerRatingSerializer, RatingHistorySerializer
from .services import RatingService

User = get_user_model()


class MyRatingsView(generics.ListAPIView):
    serializer_class = PlayerRatingSerializer

    def get_queryset(self):
        return PlayerRating.objects.filter(user=self.request.user)


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
        return PlayerRating.objects.filter(mode=mode).select_related("user").order_by("-elo")[:100]


class AfricanLeaderboardView(generics.ListAPIView):
    """Leaderboard filtered by African countries."""
    serializer_class = LeaderboardEntrySerializer
    permission_classes = [permissions.AllowAny]

    AFRICAN_CODES = [c[0] for c in User.Country.choices if c[0] != "XX"]

    def get_queryset(self):
        mode = self.request.query_params.get("mode", "blitz")
        country = self.request.query_params.get("country")
        qs = PlayerRating.objects.filter(
            mode=mode,
            user__country__in=self.AFRICAN_CODES,
        ).select_related("user")
        if country:
            qs = qs.filter(user__country=country)
        return qs.order_by("-elo")[:100]


class CountryLeaderboardView(generics.ListAPIView):
    serializer_class = LeaderboardEntrySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        mode = self.request.query_params.get("mode", "blitz")
        country = self.kwargs["country_code"]
        return (
            PlayerRating.objects.filter(mode=mode, user__country=country)
            .select_related("user")
            .order_by("-elo")[:50]
        )


class RatingHistoryView(generics.ListAPIView):
    serializer_class = RatingHistorySerializer

    def get_queryset(self):
        return RatingHistory.objects.filter(user=self.request.user)[:50]


@api_view(["GET"])
def rating_summary(request, username):
    user = User.objects.get(username=username)
    ratings = PlayerRating.objects.filter(user=user)
    return Response(PlayerRatingSerializer(ratings, many=True).data)
