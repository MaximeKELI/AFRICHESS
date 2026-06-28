from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .models import ChatMessage, Club, ClubEvent, ForumComment, ForumPost, Friendship


class FriendshipSerializer(serializers.ModelSerializer):
    from_user = UserPublicSerializer(read_only=True)
    to_user = UserPublicSerializer(read_only=True)

    class Meta:
        model = Friendship
        fields = ["id", "from_user", "to_user", "status", "created_at"]


class UserRelationshipSerializer(serializers.Serializer):
    user = UserPublicSerializer()
    friendship_status = serializers.CharField()
    friendship_id = serializers.IntegerField(allow_null=True)
    is_following = serializers.BooleanField()
    is_followed_by = serializers.BooleanField()
    followers_count = serializers.IntegerField()
    following_count = serializers.IntegerField()
    can_message = serializers.BooleanField()
    can_friend = serializers.BooleanField()


class UserSearchResultSerializer(serializers.Serializer):
    user = UserPublicSerializer()
    blitz_elo = serializers.IntegerField(allow_null=True)
    relationship = serializers.DictField()


class ClubSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    is_member = serializers.SerializerMethodField()

    class Meta:
        model = Club
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "country",
            "logo",
            "owner",
            "member_count",
            "is_public",
            "is_member",
            "created_at",
        ]

    def get_is_member(self, obj) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.members.filter(pk=request.user.pk).exists()
        return False


class ForumCommentSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)

    class Meta:
        model = ForumComment
        fields = ["id", "author", "body", "created_at"]


class ForumPostSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = ForumPost
        fields = [
            "id",
            "author",
            "title",
            "body",
            "category",
            "is_featured",
            "likes_count",
            "comments_count",
            "created_at",
        ]

    def get_comments_count(self, obj):
        return obj.comments.count()


class ForumPostDetailSerializer(ForumPostSerializer):
    comments = ForumCommentSerializer(many=True, read_only=True)

    class Meta(ForumPostSerializer.Meta):
        fields = ForumPostSerializer.Meta.fields + ["comments"]


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserPublicSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "sender", "content", "created_at"]


class ClubEventSerializer(serializers.ModelSerializer):
    created_by = UserPublicSerializer(read_only=True)

    class Meta:
        model = ClubEvent
        fields = [
            "id",
            "title",
            "description",
            "event_type",
            "starts_at",
            "created_by",
            "tournament",
            "created_at",
        ]
        read_only_fields = ["created_by", "tournament"]
