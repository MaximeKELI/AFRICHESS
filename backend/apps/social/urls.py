from django.urls import path

from . import views

urlpatterns = [
    path("friends/", views.FriendsListView.as_view(), name="friends-list"),
    path("friends/request/", views.SendFriendRequestView.as_view(), name="friend-request"),
    path("friends/<int:pk>/accept/", views.AcceptFriendView.as_view(), name="friend-accept"),
    path("clubs/", views.ClubListView.as_view(), name="club-list"),
    path("clubs/<slug:slug>/", views.ClubDetailView.as_view(), name="club-detail"),
    path("clubs/<slug:slug>/join/", views.JoinClubView.as_view(), name="club-join"),
    path("chat/<str:room_type>/<str:room_id>/", views.ChatHistoryView.as_view(), name="chat-history"),
]
