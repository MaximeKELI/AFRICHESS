"""Connexion / inscription sécurisées — pas d'énumération."""

from django.contrib.auth import get_user_model
from dj_rest_auth.serializers import LoginSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .totp_service import verify_totp

User = get_user_model()
_GENERIC_LOGIN_ERROR = "Identifiants invalides."
_DUPLICATE_EMAIL_ERROR = (
    "Plusieurs comptes utilisent cet e-mail. Connectez-vous avec votre nom d'utilisateur "
    "(ex. DKELI), pas avec l'e-mail."
)
_TOTP_REQUIRED = "TOTP_REQUIRED"


class AfrichessLoginSerializer(LoginSerializer):
    totp_code = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate(self, attrs):
        login = (attrs.get("username") or attrs.get("email") or "").strip()
        if "@" in login:
            matches = User.objects.filter(email__iexact=login)
            count = matches.count()
            if count > 1:
                names = ", ".join(sorted(matches.values_list("username", flat=True)[:5]))
                raise ValidationError(
                    {"non_field_errors": [f"{_DUPLICATE_EMAIL_ERROR} Comptes : {names}."]}
                )
            if count == 1:
                attrs["username"] = matches.first().username
                attrs["email"] = ""
            elif count == 0:
                raise ValidationError({"non_field_errors": [_GENERIC_LOGIN_ERROR]})
        elif login:
            matches = User.objects.filter(username__iexact=login)
            if matches.count() == 1:
                attrs["username"] = matches.first().username
            else:
                attrs["username"] = login
        try:
            attrs = super().validate(attrs)
        except ValidationError:
            raise ValidationError({"non_field_errors": [_GENERIC_LOGIN_ERROR]}) from None

        user = getattr(self, "user", None)
        if user and user.totp_enabled:
            totp_code = (attrs.get("totp_code") or "").strip()
            if not totp_code:
                raise ValidationError({"non_field_errors": [_TOTP_REQUIRED]})
            if not verify_totp(user.totp_secret, totp_code):
                raise ValidationError({"non_field_errors": ["Code 2FA invalide."]})

        return attrs
