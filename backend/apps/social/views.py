from django.contrib.auth import get_user_model
from django.db import models
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatMessage, Club, Friendship
from .serializers import ChatMessageSerializer, ClubSerializer, FriendshipSerializer

User = get_user_model()


class FriendsListView(generics.ListAPIView):
    serializer_class = FriendshipSerializer

    def get_queryset(self):
        user = self.request.user
        return Friendship.objects.filter(
            status=Friendship.Status.ACCEPTED
        ).filter(
            models.Q(from_user=user) | models.Q(to_user=user)
        )


class SendFriendRequestView(APIView):
    def post(self, request):
        username = request.data.get("username")
        try:
            to_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        if to_user == request.user:
            return Response({"error": "Cannot friend yourself"}, status=400)
        friendship, created = Friendship.objects.get_or_create(
            from_user=request.user, to_user=to_user,
            defaults={"status": Friendship.Status.PENDING},
        )
        return Response(FriendshipSerializer(friendship).data, status=201 if created else 200)


class AcceptFriendView(APIView):
    def post(self, request, pk):
        try:
            friendship = Friendship.objects.get(pk=pk, to_user=request.user, status=Friendship.Status.PENDING)
        except Friendship.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        friendship.status = Friendship.Status.ACCEPTED
        friendship.save()
        return Response(FriendshipSerializer(friendship).data)


class ClubListView(generics.ListCreateAPIView):
    serializer_class = ClubSerializer

    def get_queryset(self):
        country = self.request.query_params.get("country")
        qs = Club.objects.filter(is_public=True)
        if country:
            qs = qs.filter(country=country)
        return qs.order_by("-member_count")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ClubDetailView(generics.RetrieveAPIView):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    lookup_field = "slug"


class JoinClubView(APIView):
    def post(self, request, slug):
        try:
            club = Club.objects.get(slug=slug)
        except Club.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        club.members.add(request.user)
        club.member_count = club.members.count()
        club.save()
        return Response(ClubSerializer(club).data)


class ChatHistoryView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        room_type = self.kwargs["room_type"]
        room_id = self.kwargs["room_id"]
        return ChatMessage.objects.filter(room_type=room_type, room_id=room_id).order_by("-created_at")[:100][::-1]
