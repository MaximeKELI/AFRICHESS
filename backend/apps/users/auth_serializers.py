"""Connexion : évite l'ambiguïté quand plusieurs comptes partagent le même e-mail."""

from django.contrib.auth import get_user_model
from dj_rest_auth.serializers import LoginSerializer
from rest_framework.exceptions import ValidationError

User = get_user_model()


class AfrichessLoginSerializer(LoginSerializer):
    def validate(self, attrs):
        login = (attrs.get("username") or attrs.get("email") or "").strip()
        if "@" in login:
            matches = User.objects.filter(email__iexact=login)
            count = matches.count()
            if count > 1:
                raise ValidationError(
                    {
                        "non_field_errors": [
                            "Identifiants invalides. Connectez-vous avec votre nom d'utilisateur."
                        ]
                    }
                )
            if count == 1:
                attrs["username"] = matches.first().username
                attrs["email"] = ""
        elif login:
            attrs["username"] = login
        return super().validate(attrs)
