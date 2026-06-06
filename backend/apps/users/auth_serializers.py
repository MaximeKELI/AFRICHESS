"""Connexion / inscription sécurisées — pas d'énumération."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from dj_rest_auth.serializers import LoginSerializer
from rest_framework.exceptions import ValidationError

User = get_user_model()
_GENERIC_LOGIN_ERROR = "Identifiants invalides."


class AfrichessLoginSerializer(LoginSerializer):
    def validate(self, attrs):
        login = (attrs.get("username") or attrs.get("email") or "").strip()
        if "@" in login:
            matches = User.objects.filter(email__iexact=login)
            count = matches.count()
            if count > 1:
                raise ValidationError({"non_field_errors": [_GENERIC_LOGIN_ERROR]})
            if count == 1:
                attrs["username"] = matches.first().username
                attrs["email"] = ""
            elif count == 0:
                raise ValidationError({"non_field_errors": [_GENERIC_LOGIN_ERROR]})
        elif login:
            attrs["username"] = login
        try:
            return super().validate(attrs)
        except ValidationError:
            raise ValidationError({"non_field_errors": [_GENERIC_LOGIN_ERROR]}) from None


class DeprecatedRegistrationSerializer(LoginSerializer):
    """Bloque l'ancien endpoint dj-rest-auth avec message générique."""

    def validate(self, attrs):
        raise ValidationError(
            {"detail": "Utilisez POST /api/users/register/ pour créer un compte."}
        )
