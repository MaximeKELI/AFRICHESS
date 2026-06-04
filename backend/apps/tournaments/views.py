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
    def post(self, request, slug):
        try:
            tournament = Tournament.objects.get(slug=slug, status=Tournament.Status.REGISTRATION)
        except Tournament.DoesNotExist:
            return Response({"error": "Tournament not available"}, status=404)
        if tournament.participants.count() >= tournament.max_players:
            return Response({"error": "Tournament full"}, status=400)
        tournament.participants.add(request.user)
        return Response(TournamentSerializer(tournament).data)
