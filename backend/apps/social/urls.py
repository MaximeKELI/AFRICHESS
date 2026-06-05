from django.urls import path

from . import views

urlpatterns = [
    path("friends/", views.FriendsListView.as_view(), name="friends-list"),
    path("friends/pending/", views.PendingFriendsView.as_view(), name="friends-pending"),
    path("friends/request/", views.SendFriendRequestView.as_view(), name="friend-request"),
    path("friends/challenge/", views.ChallengeFriendView.as_view(), name="friend-challenge"),
    path(
        "messages/<str:username>/",
        views.DirectMessageListView.as_view(),
        name="direct-messages",
    ),
    path("friends/<int:pk>/accept/", views.AcceptFriendView.as_view(), name="friend-accept"),
    path("clubs/", views.ClubListView.as_view(), name="club-list"),
    path("clubs/<slug:slug>/", views.ClubDetailView.as_view(), name="club-detail"),
    path("clubs/<slug:slug>/join/", views.JoinClubView.as_view(), name="club-join"),
    path("forum/", views.ForumPostListView.as_view(), name="forum-list"),
    path("forum/<int:pk>/", views.ForumPostDetailView.as_view(), name="forum-detail"),
    path("forum/<int:pk>/comment/", views.ForumCommentCreateView.as_view(), name="forum-comment"),
    path("forum/<int:pk>/like/", views.ForumLikeView.as_view(), name="forum-like"),
    path(
        "chat/<str:room_type>/<str:room_id>/",
        views.ChatHistoryView.as_view(),
        name="chat-history",
    ),
    path(
        "chat/<str:room_type>/<str:room_id>/send/",
        views.PostChatMessageView.as_view(),
        name="chat-send",
    ),
]
