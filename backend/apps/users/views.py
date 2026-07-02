from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.analytics.events import log_event
from apps.common.throttles import AuthAnonThrottle, AuthUserThrottle

from .countries_data import WORLD_COUNTRIES, country_flag
from .oauth_exchange import consume_oauth_code
from .totp_service import verify_totp
from .serializers import RegisterSerializer, UserPublicSerializer, UserSerializer, UserUpdateSerializer
from .premium_utils import DIAMOND_ANALYSIS_MOVES, FREE_ANALYSIS_MOVES, GOLD_ANALYSIS_MOVES
from .stripe_service import create_billing_portal_session, create_checkout_session, handle_webhook, stripe_enabled

User = get_user_model()


@extend_schema(
    summary="Inscription d'un nouveau joueur",
    request=RegisterSerializer,
    responses={201: UserSerializer},
)
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [] if settings.DEBUG else [AuthAnonThrottle]

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
            else:
                detail = "Impossible de créer ce compte. Vérifiez vos informations."
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)
        try:
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
        except Exception:
            pass  # analytics ne doit pas bloquer l'inscription
        refresh = RefreshToken.for_user(user)
        payload = UserSerializer(user).data
        payload["access"] = str(refresh.access_token)
        payload["refresh"] = str(refresh)
        response = Response(payload, status=status.HTTP_201_CREATED)
        from .jwt_cookies import apply_httponly_refresh_response

        return apply_httponly_refresh_response(response)


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
    from django.conf import settings

    return Response(
        {
            "stripe_enabled": stripe_enabled(),
            "oauth": {
                "google": bool(getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")),
                "github": bool(getattr(settings, "GITHUB_OAUTH_CLIENT_ID", "")),
            },
            "analysis_limits": {
                "free": FREE_ANALYSIS_MOVES,
                "gold": GOLD_ANALYSIS_MOVES,
                "diamond": DIAMOND_ANALYSIS_MOVES,
            },
            "plans": [
                {
                    "id": "free",
                    "name": "Free",
                    "price_eur": 0,
                    "features": ["play", "puzzles_daily", "lessons_basic"],
                    "analysis_moves": FREE_ANALYSIS_MOVES,
                },
                {
                    "id": "gold",
                    **{k: v for k, v in PLANS["gold"].items() if k != "tier"},
                    "analysis_moves": GOLD_ANALYSIS_MOVES,
                },
                {
                    "id": "diamond",
                    **{k: v for k, v in PLANS["diamond"].items() if k != "tier"},
                    "analysis_moves": DIAMOND_ANALYSIS_MOVES,
                },
            ],
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
            "is_diamond": user.is_diamond,
            "premium_until": user.premium_until,
            "has_billing_portal": bool(user.stripe_customer_id) and stripe_enabled(),
            "stripe_enabled": stripe_enabled(),
        }
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def subscription_billing_portal(request):
    """Portail Stripe — gérer abonnement / moyen de paiement."""
    result = create_billing_portal_session(request.user)
    if result.get("error"):
        return Response(result, status=503)
    return Response(result)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def subscription_subscribe(request):
    """Stripe Checkout — pas de mode démo via API (sécurité)."""
    plan_id = (request.data.get("plan") or "").lower()
    if plan_id not in PLANS:
        return Response({"error": "Plan invalide."}, status=400)
    user = request.user
    checkout = create_checkout_session(user, plan_id)
    if checkout.get("mode") == "stripe" and checkout.get("checkout_url"):
        return Response(checkout)
    return Response(
        {"error": "Paiement non configuré. Contactez le support."},
        status=503,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([AuthAnonThrottle])
def oauth_exchange(request):
    """Échange un code OAuth one-time contre des JWT."""
    code = (request.data.get("code") or "").strip()
    user = consume_oauth_code(code)
    if not user:
        return Response({"error": "Code invalide ou expiré"}, status=400)
    totp_code = (request.data.get("totp_code") or "").strip()
    if user.totp_enabled:
        if not totp_code:
            return Response(
                {"error": "TOTP_REQUIRED", "code": "TOTP_REQUIRED"},
                status=400,
            )
        if not verify_totp(user.totp_secret, totp_code):
            return Response({"error": "Code 2FA invalide."}, status=400)
    refresh = RefreshToken.for_user(user)
    response = Response({"access": str(refresh.access_token), "refresh": str(refresh)})
    from .jwt_cookies import apply_httponly_refresh_response

    return apply_httponly_refresh_response(response)


@api_view(["POST", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
def vacation_mode(request):
    """Active ou désactive le mode vacances (daily chess)."""
    user = request.user
    if request.method == "DELETE":
        user.vacation_until = None
        user.save(update_fields=["vacation_until"])
        return Response({"vacation_until": None})
    days = min(int(request.data.get("days", 7)), 30)
    user.vacation_until = timezone.now() + timedelta(days=days)
    user.save(update_fields=["vacation_until"])
    return Response({"vacation_until": user.vacation_until.isoformat()})


@api_view(["POST", "GET"])
@permission_classes([permissions.AllowAny])
def registration_deprecated(request):
    """Ancien endpoint dj-rest-auth — désactivé."""
    return Response(
        {"detail": "Utilisez POST /api/users/register/ pour créer un compte."},
        status=status.HTTP_410_GONE,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def stripe_webhook(request):
    event, err = handle_webhook(request.body, request.META.get("HTTP_STRIPE_SIGNATURE"))
    if err:
        return Response({"error": err}, status=400)
    return Response({"received": True})
