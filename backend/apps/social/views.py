from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.text_validation import FORUM_COMMENT_MAX, validate_user_text
from apps.games.serializers import GameSerializer
from apps.games.services import GameService
from apps.notifications.models import Notification
from apps.ratings.models import PlayerRating

from .chat_access import user_can_access_chat_room
from .models import ChatMessage, Club, ClubEvent, ForumComment, ForumPost, ForumPostLike, Friendship, UserFollow
from .relationships import are_friends, friendship_row, is_blocked, relationship_payload
from .serializers import (
    ChatMessageSerializer,
    ClubEventSerializer,
    ClubSerializer,
    ForumCommentSerializer,
    ForumPostDetailSerializer,
    ForumPostSerializer,
    FriendshipSerializer,
    UserRelationshipSerializer,
    UserSearchResultSerializer,
)

User = get_user_model()


def _notify_friend_request(from_user, to_user, friendship_id: int):
    Notification.objects.create(
        user=to_user,
        type=Notification.Type.FRIEND_REQUEST,
        title=f"{from_user.display_name or from_user.username} vous a ajouté",
        body="Acceptez ou refusez la demande d'amitié",
        data={"friendship_id": friendship_id, "from_username": from_user.username},
    )


class SentFriendsView(generics.ListAPIView):
    serializer_class = FriendshipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Friendship.objects.filter(
            from_user=self.request.user,
            status=Friendship.Status.PENDING,
        ).select_related("to_user")


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
        username = (request.data.get("username") or "").strip()
        if not username:
            return Response({"error": "Username required"}, status=400)
        try:
            to_user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        if to_user == request.user:
            return Response({"error": "Cannot friend yourself"}, status=400)
        if is_blocked(request.user, to_user):
            return Response({"error": "Action non autorisée"}, status=403)

        reverse = Friendship.objects.filter(
            from_user=to_user,
            to_user=request.user,
            status=Friendship.Status.PENDING,
        ).first()
        if reverse:
            reverse.status = Friendship.Status.ACCEPTED
            reverse.save(update_fields=["status"])
            return Response(FriendshipSerializer(reverse).data)

        existing = friendship_row(request.user, to_user)
        if existing:
            if existing.status == Friendship.Status.ACCEPTED:
                return Response({"error": "Déjà amis"}, status=400)
            if existing.status == Friendship.Status.BLOCKED:
                return Response({"error": "Action non autorisée"}, status=403)
            if existing.status == Friendship.Status.PENDING:
                if existing.from_user_id == request.user.id:
                    return Response(FriendshipSerializer(existing).data)
                return Response({"error": "Demande déjà reçue — acceptez-la"}, status=400)

        friendship = Friendship.objects.create(
            from_user=request.user,
            to_user=to_user,
            status=Friendship.Status.PENDING,
        )
        _notify_friend_request(request.user, to_user, friendship.id)
        return Response(FriendshipSerializer(friendship).data, status=201)


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


class DeclineFriendView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            friendship = Friendship.objects.get(
                pk=pk, to_user=request.user, status=Friendship.Status.PENDING
            )
        except Friendship.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        friendship.delete()
        return Response(status=204)


class CancelFriendRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            friendship = Friendship.objects.get(
                pk=pk, from_user=request.user, status=Friendship.Status.PENDING
            )
        except Friendship.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        friendship.delete()
        return Response(status=204)


class UnfriendView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        try:
            other = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        row = friendship_row(request.user, other)
        if not row or row.status != Friendship.Status.ACCEPTED:
            return Response({"error": "Not friends"}, status=400)
        row.delete()
        return Response(status=204)


class BlockUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        try:
            other = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        if other == request.user:
            return Response({"error": "Impossible"}, status=400)
        Friendship.objects.filter(
            Q(from_user=request.user, to_user=other) | Q(from_user=other, to_user=request.user)
        ).delete()
        UserFollow.objects.filter(
            Q(follower=request.user, following=other) | Q(follower=other, following=request.user)
        ).delete()
        friendship = Friendship.objects.create(
            from_user=request.user,
            to_user=other,
            status=Friendship.Status.BLOCKED,
        )
        return Response(FriendshipSerializer(friendship).data, status=201)


class UserSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response([])
        country = (request.query_params.get("country") or "").strip().upper()
        qs = User.objects.filter(
            Q(username__icontains=q)
            | Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(email__icontains=q)
        ).exclude(pk=request.user.pk)
        if country and len(country) == 2:
            qs = qs.filter(country=country)
        users = list(qs.order_by("username")[:20])
        ratings = {
            r.user_id: r.elo
            for r in PlayerRating.objects.filter(user_id__in=[u.id for u in users], mode="blitz")
        }
        payload = []
        for user in users:
            payload.append(
                {
                    "user": user,
                    "blitz_elo": ratings.get(user.id),
                    "relationship": relationship_payload(request.user, user),
                }
            )
        return Response(UserSearchResultSerializer(payload, many=True).data)


class UserRelationshipView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        try:
            target = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        data = relationship_payload(request.user, target)
        data["user"] = target
        return Response(UserRelationshipSerializer(data).data)


class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        try:
            target = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        if target == request.user:
            return Response({"error": "Impossible"}, status=400)
        if is_blocked(request.user, target):
            return Response({"error": "Action non autorisée"}, status=403)
        UserFollow.objects.get_or_create(follower=request.user, following=target)
        return Response(relationship_payload(request.user, target))


class UnfollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        try:
            target = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        UserFollow.objects.filter(follower=request.user, following=target).delete()
        return Response(relationship_payload(request.user, target))


class FollowingListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username=None):
        if username and username != "me":
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=404)
        else:
            user = request.user
        from apps.users.serializers import UserPublicSerializer

        follows = UserFollow.objects.filter(follower=user).select_related("following")[:100]
        return Response([UserPublicSerializer(f.following).data for f in follows])


class FollowersListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        from apps.users.serializers import UserPublicSerializer

        follows = UserFollow.objects.filter(following=user).select_related("follower")[:100]
        return Response([UserPublicSerializer(f.follower).data for f in follows])


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
    serializer_class = ClubSerializer
    lookup_field = "slug"
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Club.objects.filter(Q(is_public=True) | Q(members=user)).distinct()
        return Club.objects.filter(is_public=True)


class JoinClubView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        try:
            club = Club.objects.get(slug=slug)
        except Club.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        if not club.is_public and not club.members.filter(pk=request.user.pk).exists():
            if club.owner_id != request.user.id:
                return Response({"error": "Club privé"}, status=403)
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
        if not are_friends(request.user, opponent):
            return Response({"error": "Vous devez être amis"}, status=400)

        odds = request.data.get("odds", "none")
        is_rated = request.data.get("is_rated", True)
        time_control = request.data.get("time_control")
        is_timed = request.data.get("is_timed", True)
        from apps.games.time_control import default_time_control_for_mode

        if is_timed and not time_control:
            time_control = default_time_control_for_mode(mode)
        from apps.games.odds import fen_for_odds

        starting_fen = fen_for_odds(odds)
        game = GameService().create_friend_game(
            request.user,
            opponent,
            mode=mode,
            is_rated=bool(is_rated),
            is_timed=bool(is_timed),
            time_control=time_control,
            starting_fen=starting_fen,
            odds_preset=odds if odds and odds != "none" else "",
        )
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
        if not user_can_access_chat_room(request.user, room_type, room_id):
            return Response({"error": "Accès refusé"}, status=403)
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
        if is_blocked(request.user, other):
            return Response({"error": "Action non autorisée"}, status=403)
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
        if is_blocked(request.user, other):
            return Response({"error": "Action non autorisée"}, status=403)
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
        Notification.objects.create(
            user=other,
            type=Notification.Type.DIRECT_MESSAGE,
            title=f"{request.user.display_name or request.user.username}",
            body=content[:200],
            data={"from_username": request.user.username, "room_id": room_id},
        )
        return Response(ChatMessageSerializer(msg).data, status=201)


class ForumPostListView(generics.ListCreateAPIView):
    serializer_class = ForumPostSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = ForumPost.objects.select_related("author").all()
        featured = self.request.query_params.get("featured")
        category = self.request.query_params.get("category")
        if featured == "1":
            qs = qs.filter(is_featured=True)
        if category:
            qs = qs.filter(category=category)
        return qs[:50]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ForumPostDetailView(generics.RetrieveAPIView):
    queryset = ForumPost.objects.select_related("author").prefetch_related(
        "comments__author"
    )
    serializer_class = ForumPostDetailSerializer
    permission_classes = [permissions.AllowAny]


class ForumCommentCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            post = ForumPost.objects.get(pk=pk)
        except ForumPost.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        body = validate_user_text(
            request.data.get("body") or "",
            max_len=FORUM_COMMENT_MAX,
            field="body",
        )
        comment = ForumComment.objects.create(
            post=post, author=request.user, body=body
        )
        return Response(ForumCommentSerializer(comment).data, status=201)


class ForumLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            post = ForumPost.objects.get(pk=pk)
        except ForumPost.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        _, created = ForumPostLike.objects.get_or_create(user=request.user, post=post)
        if created:
            post.likes_count += 1
            post.save(update_fields=["likes_count"])
        return Response({"likes_count": post.likes_count, "liked": True})


class ChatHistoryView(generics.ListAPIView):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        room_type = self.kwargs["room_type"]
        room_id = self.kwargs["room_id"]
        if not user_can_access_chat_room(request.user, room_type, room_id):
            return Response({"error": "Accès refusé"}, status=403)
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        room_type = self.kwargs["room_type"]
        room_id = self.kwargs["room_id"]
        return ChatMessage.objects.filter(
            room_type=room_type, room_id=room_id
        ).select_related("sender").order_by("-created_at")[:100][::-1]


class ClubEventListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        if not Club.objects.filter(slug=slug, members=request.user).exists():
            club = Club.objects.filter(slug=slug, is_public=True).first()
            if not club:
                return Response({"error": "Accès refusé"}, status=403)
        events = ClubEvent.objects.filter(club__slug=slug).select_related("created_by")[:30]
        return Response(ClubEventSerializer(events, many=True).data)

    def post(self, request, slug):
        try:
            club = Club.objects.get(slug=slug)
        except Club.DoesNotExist:
            return Response({"error": "Club introuvable"}, status=404)
        if club.owner_id != request.user.id and not request.user.is_staff:
            return Response({"error": "Réservé au propriétaire"}, status=403)
        title = (request.data.get("title") or "").strip()[:200]
        if not title:
            return Response({"error": "Titre requis"}, status=400)
        from django.utils.dateparse import parse_datetime

        starts = parse_datetime(request.data.get("starts_at") or "") or timezone.now()
        event = ClubEvent.objects.create(
            club=club,
            created_by=request.user,
            title=title,
            description=(request.data.get("description") or "")[:2000],
            event_type=request.data.get("event_type", ClubEvent.EventType.ANNOUNCEMENT),
            starts_at=starts,
        )
        return Response(ClubEventSerializer(event).data, status=201)


class ClubArenaChallengeView(APIView):
    """Crée un tournoi arène inter-clubs."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug):
        from apps.tournaments.models import Tournament

        try:
            club_a = Club.objects.get(slug=slug)
        except Club.DoesNotExist:
            return Response({"error": "Club introuvable"}, status=404)
        if not club_a.members.filter(pk=request.user.pk).exists():
            return Response({"error": "Non membre"}, status=403)

        other_slug = request.data.get("opponent_club")
        try:
            club_b = Club.objects.get(slug=other_slug)
        except Club.DoesNotExist:
            return Response({"error": "Club adversaire introuvable"}, status=404)

        from django.utils.text import slugify

        name = f"{club_a.name} vs {club_b.name}"
        base_slug = slugify(name)[:40]
        slug_t = base_slug
        n = 1
        while Tournament.objects.filter(slug=slug_t).exists():
            slug_t = f"{base_slug}-{n}"
            n += 1

        tournament = Tournament.objects.create(
            name=name,
            slug=slug_t,
            format=Tournament.Format.CLUB_ARENA,
            status=Tournament.Status.REGISTRATION,
            mode=request.data.get("mode", "blitz"),
            starts_at=timezone.now(),
            created_by=request.user,
            club_a=club_a,
            club_b=club_b,
        )
        ClubEvent.objects.create(
            club=club_a,
            created_by=request.user,
            title=name,
            event_type=ClubEvent.EventType.TOURNAMENT,
            starts_at=tournament.starts_at,
            tournament=tournament,
        )
        return Response({"slug": tournament.slug, "name": tournament.name}, status=201)
