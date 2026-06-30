"""Tâches Celery — abonnements."""

from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


@shared_task
def expire_premium_subscriptions():
    """Rétrograde les comptes dont premium_until est dépassé."""
    now = timezone.now()
    updated = User.objects.exclude(subscription_tier=User.SubscriptionTier.FREE).filter(
        premium_until__lt=now
    ).update(subscription_tier=User.SubscriptionTier.FREE, premium_until=None)
    return updated
