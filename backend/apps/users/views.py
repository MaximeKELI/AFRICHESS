from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.events import log_event

from .countries_data import WORLD_COUNTRIES, country_flag
from .serializers import RegisterSerializer, UserPublicSerializer, UserSerializer, UserUpdateSerializer
from .stripe_service import create_checkout_session, handle_webhook, stripe_enabled

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
        log_event(
            "register",
            user=user,
            path="/register",
            metadata={
                "country": user.country,
                "discovery_source": user.discovery_source,
                "registration_locale": user.registration_locale,
            },
            request=request,
        )
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
    queryset = User.objects.select_related("stats").all()
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
    lang = (request.query_params.get("lang") or request.headers.get("Accept-Language", "en"))[:2]
    use_fr = lang == "fr"
    rows = []
    for code, name_en, name_fr, is_african in WORLD_COUNTRIES:
        rows.append(
            {
                "code": code,
                "name": name_fr if use_fr else name_en,
                "name_en": name_en,
                "name_fr": name_fr,
                "flag": country_flag(code),
                "is_african": is_african,
            }
        )
    rows.sort(key=lambda r: (not r["is_african"], r["name"]))
    return Response(rows)


PLANS = {
    "gold": {
        "tier": User.SubscriptionTier.GOLD,
        "price_eur": 4.99,
        "features": [
            "bots_premium",
            "puzzle_rush_unlimited",
            "no_ads",
        ],
    },
    "diamond": {
        "tier": User.SubscriptionTier.DIAMOND,
        "price_eur": 9.99,
        "features": [
            "bots_premium",
            "puzzle_rush_unlimited",
            "deep_game_review",
            "lessons_unlimited",
            "no_ads",
        ],
    },
}


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def subscription_plans(request):
    return Response(
        {
            "stripe_enabled": stripe_enabled(),
            "plans": [
                {
                    "id": "free",
                    "name": "Free",
                    "price_eur": 0,
                    "features": ["play", "puzzles_daily", "lessons_basic"],
                },
                {"id": "gold", **{k: v for k, v in PLANS["gold"].items() if k != "tier"}},
                {"id": "diamond", **{k: v for k, v in PLANS["diamond"].items() if k != "tier"}},
            ]
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def subscription_status(request):
    user = request.user
    return Response(
        {
            "tier": user.subscription_tier,
            "is_premium": user.is_premium,
            "premium_until": user.premium_until,
        }
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def subscription_subscribe(request):
    """Stripe Checkout si configuré, sinon mode démo (30 jours)."""
    plan_id = (request.data.get("plan") or "").lower()
    if plan_id not in PLANS:
        return Response({"error": "Plan invalide."}, status=400)
    user = request.user
    checkout = create_checkout_session(user, plan_id)
    if checkout.get("mode") == "stripe" and checkout.get("checkout_url"):
        return Response(checkout)
    user.subscription_tier = PLANS[plan_id]["tier"]
    user.premium_until = timezone.now() + timedelta(days=30)
    user.save(update_fields=["subscription_tier", "premium_until"])
    return Response(
        {
            "mode": "demo",
            "tier": user.subscription_tier,
            "is_premium": user.is_premium,
            "premium_until": user.premium_until,
            "message": "Abonnement activé (mode démo).",
        }
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def stripe_webhook(request):
    event, err = handle_webhook(request.body, request.META.get("HTTP_STRIPE_SIGNATURE"))
    if err:
        return Response({"error": err}, status=400)
    return Response({"received": True})
