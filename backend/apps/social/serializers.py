from rest_framework import serializers

from apps.users.serializers import UserPublicSerializer

from .models import ChatMessage, Club, Friendship


class FriendshipSerializer(serializers.ModelSerializer):
    from_user = UserPublicSerializer(read_only=True)
    to_user = UserPublicSerializer(read_only=True)

    class Meta:
        model = Friendship
        fields = ["id", "from_user", "to_user", "status", "created_at"]


class ClubSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)

    class Meta:
        model = Club
        fields = ["id", "name", "slug", "description", "country", "logo", "owner",
                  "member_count", "is_public", "created_at"]


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserPublicSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "sender", "content", "created_at"]
