"""Stripe Checkout — abonnements Gold / Diamond."""

from __future__ import annotations

from datetime import timedelta

from decouple import config
from django.utils import timezone

STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

PLAN_PRICES = {
    "gold": config("STRIPE_PRICE_GOLD", default=""),
    "diamond": config("STRIPE_PRICE_DIAMOND", default=""),
}


def stripe_enabled() -> bool:
    return bool(STRIPE_SECRET_KEY and any(PLAN_PRICES.values()))


def _client():
    import stripe

    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


def create_checkout_session(user, plan_id: str) -> dict:
    price_id = PLAN_PRICES.get(plan_id)
    if not stripe_enabled() or not price_id:
        return {"mode": "demo"}
    stripe = _client()
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=user.email or None,
        client_reference_id=str(user.id),
        metadata={"plan": plan_id, "user_id": str(user.id)},
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{FRONTEND_URL}/premium?success=1&plan={plan_id}",
        cancel_url=f"{FRONTEND_URL}/premium?canceled=1",
    )
    return {"mode": "stripe", "checkout_url": session.url, "session_id": session.id}


def activate_plan(user, plan_id: str, days: int = 30):
    from .models import User

    tier_map = {
        "gold": User.SubscriptionTier.GOLD,
        "diamond": User.SubscriptionTier.DIAMOND,
    }
    user.subscription_tier = tier_map[plan_id]
    user.premium_until = timezone.now() + timedelta(days=days)
    user.save(update_fields=["subscription_tier", "premium_until"])


def handle_webhook(payload: bytes, sig_header: str | None):
    if not STRIPE_WEBHOOK_SECRET:
        return None, "Webhook secret not configured"
    stripe = _client()
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        return None, str(exc)

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        plan = (session.get("metadata") or {}).get("plan")
        user_id = (session.get("metadata") or {}).get("user_id")
        if plan and user_id:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            try:
                user = User.objects.get(pk=int(user_id))
                activate_plan(user, plan, days=30)
            except User.DoesNotExist:
                pass
    return event, None
