from django.contrib.auth import get_user_model
from django.db import models
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.serializers import GameSerializer
from apps.games.services import GameService
from apps.notifications.models import Notification

from .models import ChatMessage, Club, Friendship
from .serializers import ChatMessageSerializer, ClubSerializer, FriendshipSerializer

User = get_user_model()


def _are_friends(user_a, user_b) -> bool:
    return Friendship.objects.filter(
        status=Friendship.Status.ACCEPTED,
    ).filter(
        models.Q(from_user=user_a, to_user=user_b)
        | models.Q(from_user=user_b, to_user=user_a)
    ).exists()


class PendingFriendsView(generics.ListAPIView):
    serializer_class = FriendshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Friendship.objects.filter(
            to_user=self.request.user,
            status=Friendship.Status.PENDING,
        ).select_related("from_user")


class FriendsListView(generics.ListAPIView):
    serializer_class = FriendshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Friendship.objects.filter(
            status=Friendship.Status.ACCEPTED
        ).filter(
            models.Q(from_user=user) | models.Q(to_user=user)
        )


class SendFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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
    permission_classes = [permissions.IsAuthenticated]

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

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        country = self.request.query_params.get("country")
        qs = Club.objects.filter(is_public=True)
        if country:
            qs = qs.filter(country=country)
        return qs.order_by("-member_count")

    def perform_create(self, serializer):
        from django.utils.text import slugify

        name = serializer.validated_data["name"]
        base = slugify(name) or "club"
        slug = base
        n = 1
        while Club.objects.filter(slug=slug).exists():
            slug = f"{base}-{n}"
            n += 1
        club = serializer.save(owner=self.request.user, slug=slug)
        club.members.add(self.request.user)
        club.member_count = 1
        club.save(update_fields=["member_count"])


class ClubDetailView(generics.RetrieveAPIView):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    lookup_field = "slug"
    permission_classes = [permissions.AllowAny]


class JoinClubView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        try:
            club = Club.objects.get(slug=slug)
        except Club.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        club.members.add(request.user)
        club.member_count = club.members.count()
        club.save()
        return Response(ClubSerializer(club).data)


class ChallengeFriendView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        username = request.data.get("username")
        mode = request.data.get("mode", "blitz")
        try:
            opponent = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "Joueur introuvable"}, status=404)
        if opponent == request.user:
            return Response({"error": "Impossible"}, status=400)
        if not _are_friends(request.user, opponent):
            return Response({"error": "Vous devez être amis"}, status=400)

        game = GameService().create_friend_game(request.user, opponent, mode=mode)
        Notification.objects.create(
            user=opponent,
            type=Notification.Type.GAME_INVITE,
            title=f"{request.user.display_name or request.user.username} vous défie",
            body=f"Partie {mode} — rejoignez la partie",
            data={"game_id": str(game.id), "mode": mode},
        )
        return Response(GameSerializer(game).data, status=status.HTTP_201_CREATED)


class PostChatMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_type, room_id):
        content = (request.data.get("message") or "").strip()[:500]
        if not content:
            return Response({"error": "Message vide"}, status=400)
        msg = ChatMessage.objects.create(
            sender=request.user,
            room_type=room_type,
            room_id=room_id,
            content=content,
        )
        return Response(ChatMessageSerializer(msg).data, status=201)


def _dm_room_id(user_a_id: int, user_b_id: int) -> str:
    a, b = sorted([user_a_id, user_b_id])
    return f"{a}_{b}"


class DirectMessageListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        try:
            other = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        room_id = _dm_room_id(request.user.id, other.id)
        msgs = ChatMessage.objects.filter(
            room_type=ChatMessage.RoomType.DIRECT, room_id=room_id
        ).select_related("sender").order_by("created_at")[:200]
        return Response(ChatMessageSerializer(msgs, many=True).data)

    def post(self, request, username):
        try:
            other = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        content = (request.data.get("message") or "").strip()[:500]
        if not content:
            return Response({"error": "Empty"}, status=400)
        room_id = _dm_room_id(request.user.id, other.id)
        msg = ChatMessage.objects.create(
            sender=request.user,
            room_type=ChatMessage.RoomType.DIRECT,
            room_id=room_id,
            content=content,
        )
        return Response(ChatMessageSerializer(msg).data, status=201)


class ChatHistoryView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        room_type = self.kwargs["room_type"]
        room_id = self.kwargs["room_id"]
        return ChatMessage.objects.filter(
            room_type=room_type, room_id=room_id
        ).select_related("sender").order_by("-created_at")[:100][::-1]
