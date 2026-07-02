from django.db import models
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.serializers import GameSerializer

from .models import Tournament, TournamentParticipant
from .querysets import tournament_detail_queryset, tournament_list_queryset
from .serializers import TournamentParticipantSerializer, TournamentSerializer
from .services import TournamentEngine


class TournamentListView(generics.ListAPIView):
    serializer_class = TournamentSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = tournament_list_queryset()
        if self.request.query_params.get("african"):
            qs = qs.filter(is_african_cup=True)
        return qs.order_by("-starts_at")


class TournamentDetailView(generics.RetrieveAPIView):
    serializer_class = TournamentSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return tournament_detail_queryset()


class RegisterTournamentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        try:
            tournament = Tournament.objects.get(slug=slug, status=Tournament.Status.REGISTRATION)
        except Tournament.DoesNotExist:
            return Response({"error": "Tournament not available"}, status=404)
        enrolled = TournamentParticipant.objects.filter(tournament=tournament).count()
        if enrolled >= tournament.max_players:
            return Response({"error": "Tournament full"}, status=400)
        TournamentEngine().ensure_participant(tournament, request.user)
        club_id = request.data.get("club_id")
        if club_id and tournament.format in (
            Tournament.Format.CLUB_ARENA,
            Tournament.Format.TEAM_BATTLE,
        ):
            try:
                club_id = int(club_id)
            except (TypeError, ValueError):
                return Response({"error": "club_id invalide"}, status=400)
            if tournament.format == Tournament.Format.TEAM_BATTLE:
                allowed = {tournament.club_a_id, tournament.club_b_id}
                if club_id not in allowed or None in allowed:
                    return Response(
                        {"error": "club_id doit être l'une des deux équipes du tournoi"},
                        status=400,
                    )
            TournamentParticipant.objects.filter(
                tournament=tournament, user=request.user
            ).update(club_id=club_id)
        tournament = tournament_detail_queryset().get(pk=tournament.pk)
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
        tournament = tournament_detail_queryset().get(pk=tournament.pk)
        return Response(TournamentSerializer(tournament).data)


class TournamentStandingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            tournament = tournament_detail_queryset().get(slug=slug)
        except Tournament.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        standings = TournamentEngine().get_standings(tournament)
        return Response(
            TournamentParticipantSerializer(standings, many=True).data
        )


class TournamentTeamScoresView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            tournament = Tournament.objects.select_related("club_a", "club_b").get(slug=slug)
        except Tournament.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if tournament.format != Tournament.Format.TEAM_BATTLE:
            return Response({"error": "Not a team battle"}, status=400)
        scores = TournamentEngine().get_team_scores(tournament)
        return Response(
            {
                "teams": scores,
                "club_a": {
                    "id": tournament.club_a_id,
                    "name": tournament.club_a.name if tournament.club_a_id else None,
                    "slug": tournament.club_a.slug if tournament.club_a_id else None,
                },
                "club_b": {
                    "id": tournament.club_b_id,
                    "name": tournament.club_b.name if tournament.club_b_id else None,
                    "slug": tournament.club_b.slug if tournament.club_b_id else None,
                },
            }
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
