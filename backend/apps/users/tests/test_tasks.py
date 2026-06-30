"""Tests tâches Celery — abonnements."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.users.models import User as UserModel
from apps.users.tasks import expire_premium_subscriptions

User = get_user_model()


class ExpirePremiumTaskTests(TestCase):
    def test_downgrades_expired_users(self):
        user = User.objects.create_user(username="expired_gold", password="x")
        user.subscription_tier = UserModel.SubscriptionTier.GOLD
        user.premium_until = timezone.now() - timedelta(days=1)
        user.save()
        count = expire_premium_subscriptions()
        self.assertEqual(count, 1)
        user.refresh_from_db()
        self.assertEqual(user.subscription_tier, UserModel.SubscriptionTier.FREE)
        self.assertIsNone(user.premium_until)

    def test_keeps_active_premium(self):
        user = User.objects.create_user(username="active_gold", password="x")
        user.subscription_tier = UserModel.SubscriptionTier.GOLD
        user.premium_until = timezone.now() + timedelta(days=10)
        user.save()
        expire_premium_subscriptions()
        user.refresh_from_db()
        self.assertEqual(user.subscription_tier, UserModel.SubscriptionTier.GOLD)
