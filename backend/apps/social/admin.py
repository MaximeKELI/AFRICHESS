from django.contrib import admin

from .models import ChatMessage, Club, ForumComment, ForumPost, Friendship


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ["from_user", "to_user", "status", "created_at"]


@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ["name", "country", "member_count", "owner"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["sender", "room_type", "room_id", "created_at"]
