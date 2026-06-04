from django.urls import path

from . import views

urlpatterns = [
    path("friends/", views.FriendsListView.as_view(), name="friends-list"),
    path("friends/pending/", views.PendingFriendsView.as_view(), name="friends-pending"),
    path("friends/request/", views.SendFriendRequestView.as_view(), name="friend-request"),
    path("friends/challenge/", views.ChallengeFriendView.as_view(), name="friend-challenge"),
    path("friends/<int:pk>/accept/", views.AcceptFriendView.as_view(), name="friend-accept"),
    path("clubs/", views.ClubListView.as_view(), name="club-list"),
    path("clubs/<slug:slug>/", views.ClubDetailView.as_view(), name="club-detail"),
    path("clubs/<slug:slug>/join/", views.JoinClubView.as_view(), name="club-join"),
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
