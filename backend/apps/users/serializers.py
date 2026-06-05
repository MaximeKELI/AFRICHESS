from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .countries_data import VALID_COUNTRY_CODES
from .models import UserStats

User = get_user_model()


class UserStatsSerializer(serializers.ModelSerializer):
    win_rate = serializers.ReadOnlyField()

    class Meta:
        model = UserStats
        fields = [
            "games_played",
            "games_won",
            "games_drawn",
            "games_lost",
            "puzzles_solved",
            "best_win_streak",
            "current_streak",
            "win_rate",
            "total_play_time_seconds",
        ]


class UserSerializer(serializers.ModelSerializer):
    stats = UserStatsSerializer(read_only=True)
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "avatar",
            "chess_level",
            "bio",
            "country",
            "city",
            "preferred_language",
            "is_african_highlight",
            "low_bandwidth_mode",
            "title",
            "fide_id",
            "stats",
            "date_joined",
        ]
        read_only_fields = ["id", "date_joined", "is_african_highlight"]


class UserPublicSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "display_name",
            "avatar",
            "bio",
            "country",
            "city",
            "title",
            "is_african_highlight",
        ]


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "avatar",
            "chess_level",
            "bio",
            "country",
            "city",
            "preferred_language",
            "low_bandwidth_mode",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    chess_level = serializers.ChoiceField(
        choices=User.ChessLevel.choices,
        required=False,
        default=User.ChessLevel.INTERMEDIATE,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "country",
            "preferred_language",
            "chess_level",
        ]

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Cet e-mail est déjà utilisé.")
        return value

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )
        return data

    def create(self, validated_data):
        from .setup import setup_new_user

        validated_data.pop("password_confirm", None)
        password = validated_data.pop("password")
        validated_data.setdefault("chess_level", User.ChessLevel.INTERMEDIATE)
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        setup_new_user(user)
        return user
