"""Petites vues auth au niveau config (évite imports lourds dans urls.py)."""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["POST", "GET"])
@permission_classes([AllowAny])
def registration_deprecated(request):
    """Ancien endpoint dj-rest-auth — redirige vers /api/users/register/."""
    return Response(
        {"detail": "Utilisez POST /api/users/register/ pour créer un compte."},
        status=status.HTTP_410_GONE,
    )
