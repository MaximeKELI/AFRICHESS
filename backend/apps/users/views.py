from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserPublicSerializer, UserSerializer, UserUpdateSerializer

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        from .models import UserStats
        from .services import init_user_ratings

        UserStats.objects.get_or_create(user=user)
        init_user_ratings(user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "username"


class AfricanPlayersView(generics.ListAPIView):
    """Highlighted African chess players."""
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return User.objects.filter(is_african_highlight=True).order_by("-date_joined")[:50]


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def countries_list(request):
    return Response([{"code": c[0], "name": c[1]} for c in User.Country.choices])
