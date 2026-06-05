from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserPublicSerializer, UserSerializer, UserUpdateSerializer

User = get_user_model()


@extend_schema(
    summary="Inscription d'un nouveau joueur",
    request=RegisterSerializer,
    responses={201: UserSerializer},
)
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                user = serializer.save()
        except IntegrityError as exc:
            msg = str(exc).lower()
            if "users_userstats" in msg:
                detail = (
                    "Erreur technique à l'inscription. "
                    "Redémarrez le serveur backend (docker compose restart backend) puis réessayez."
                )
            elif "username" in msg:
                detail = "Ce nom d'utilisateur est déjà pris."
            elif "email" in msg:
                detail = "Cet e-mail est déjà utilisé."
            else:
                detail = "Nom d'utilisateur ou e-mail déjà utilisé."
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@extend_schema(summary="Profil du joueur connecté (lecture / mise à jour)")
class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

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
