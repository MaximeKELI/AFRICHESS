"""Stripe Checkout — abonnements Gold / Diamond."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone as dt_timezone

from decouple import config
from django.utils import timezone

STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

PLAN_PRICES = {
    "gold": config("STRIPE_PRICE_GOLD", default=""),
    "diamond": config("STRIPE_PRICE_DIAMOND", default=""),
}

TIER_BY_PLAN = {
    "gold": "gold",
    "diamond": "diamond",
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


def _premium_until_from_period_end(period_end: int | None, fallback_days: int = 30):
    if period_end:
        return datetime.fromtimestamp(period_end, tz=dt_timezone.utc)
    return timezone.now() + timedelta(days=fallback_days)


def activate_plan(user, plan_id: str, days: int = 30, period_end: int | None = None):
    from .models import User

    tier_map = {
        "gold": User.SubscriptionTier.GOLD,
        "diamond": User.SubscriptionTier.DIAMOND,
    }
    if plan_id not in tier_map:
        return
    user.subscription_tier = tier_map[plan_id]
    user.premium_until = _premium_until_from_period_end(period_end, days=days)
    user.save(update_fields=["subscription_tier", "premium_until"])


def deactivate_plan(user):
    from .models import User

    user.subscription_tier = User.SubscriptionTier.FREE
    user.premium_until = None
    user.save(update_fields=["subscription_tier", "premium_until"])


def _plan_from_subscription(subscription: dict) -> str | None:
    meta = subscription.get("metadata") or {}
    plan = meta.get("plan")
    if plan in TIER_BY_PLAN:
        return plan
    items = subscription.get("items", {}).get("data") or []
    for item in items:
        price_id = (item.get("price") or {}).get("id") or item.get("price")
        for plan_id, configured in PLAN_PRICES.items():
            if configured and price_id == configured:
                return plan_id
    return None


def _user_from_metadata(metadata: dict):
    from django.contrib.auth import get_user_model

    user_id = (metadata or {}).get("user_id")
    if not user_id:
        return None
    User = get_user_model()
    try:
        return User.objects.get(pk=int(user_id))
    except (User.DoesNotExist, ValueError, TypeError):
        return None


def _handle_subscription_updated(subscription: dict):
    status = subscription.get("status")
    user = _user_from_metadata(subscription.get("metadata") or {})
    if not user:
        return
    plan_id = _plan_from_subscription(subscription)
    if status in ("active", "trialing") and plan_id:
        activate_plan(
            user,
            plan_id,
            period_end=subscription.get("current_period_end"),
        )
    elif status in ("canceled", "unpaid", "past_due", "incomplete_expired"):
        if subscription.get("cancel_at_period_end") and status == "active":
            activate_plan(
                user,
                plan_id or "gold",
                period_end=subscription.get("current_period_end"),
            )
        else:
            deactivate_plan(user)


def handle_webhook(payload: bytes, sig_header: str | None):
    if not STRIPE_WEBHOOK_SECRET:
        return None, "Webhook secret not configured"
    stripe = _client()
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        return None, str(exc)

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        plan = (obj.get("metadata") or {}).get("plan")
        user_id = (obj.get("metadata") or {}).get("user_id")
        period_end = None
        sub_id = obj.get("subscription")
        if sub_id:
            try:
                sub = stripe.Subscription.retrieve(sub_id)
                period_end = sub.get("current_period_end")
                if not plan:
                    plan = _plan_from_subscription(sub)
            except Exception:
                pass
        if plan and user_id:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            try:
                user = User.objects.get(pk=int(user_id))
                activate_plan(user, plan, period_end=period_end)
            except User.DoesNotExist:
                pass
    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        _handle_subscription_updated(obj)
    elif event_type == "invoice.payment_failed":
        sub_id = obj.get("subscription")
        if sub_id:
            try:
                sub = stripe.Subscription.retrieve(sub_id)
                if sub.get("status") in ("unpaid", "past_due", "canceled"):
                    user = _user_from_metadata(sub.get("metadata") or {})
                    if user:
                        deactivate_plan(user)
            except Exception:
                pass

    return event, None
