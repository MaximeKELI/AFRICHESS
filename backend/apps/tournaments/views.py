from django.db import models
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.serializers import GameSerializer

from .models import Tournament
from .serializers import TournamentParticipantSerializer, TournamentSerializer
from .services import TournamentEngine


class TournamentListView(generics.ListAPIView):
    serializer_class = TournamentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Tournament.objects.all()
        if self.request.query_params.get("african"):
            qs = qs.filter(is_african_cup=True)
        return qs.order_by("-starts_at")


class TournamentDetailView(generics.RetrieveAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"


class RegisterTournamentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        try:
            tournament = Tournament.objects.get(slug=slug, status=Tournament.Status.REGISTRATION)
        except Tournament.DoesNotExist:
            return Response({"error": "Tournament not available"}, status=404)
        if tournament.participants.count() >= tournament.max_players:
            return Response({"error": "Tournament full"}, status=400)
        TournamentEngine().ensure_participant(tournament, request.user)
        return Response(TournamentSerializer(tournament).data)


class StartTournamentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        try:
            tournament = Tournament.objects.get(slug=slug)
        except Tournament.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if tournament.created_by_id != request.user.id and not request.user.is_staff:
            return Response({"error": "Forbidden"}, status=403)
        try:
            tournament = TournamentEngine().start_tournament(tournament)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        return Response(TournamentSerializer(tournament).data)


class TournamentStandingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            tournament = Tournament.objects.get(slug=slug)
        except Tournament.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        standings = TournamentEngine().get_standings(tournament)
        return Response(
            TournamentParticipantSerializer(standings, many=True).data
        )


class MyTournamentGameView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        try:
            tournament = Tournament.objects.get(slug=slug)
        except Tournament.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        from apps.games.models import Game

        game = (
            Game.objects.filter(
                tournament=tournament,
                status=Game.Status.ACTIVE,
            )
            .filter(
                models.Q(white_player=request.user)
                | models.Q(black_player=request.user)
            )
            .first()
        )
        if not game:
            return Response({"game": None})
        return Response({"game": GameSerializer(game).data})
