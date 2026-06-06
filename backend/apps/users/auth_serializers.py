"""Connexion / inscription sécurisées — pas d'énumération."""

from django.contrib.auth import get_user_model
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


