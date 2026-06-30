"""Tests abonnement démo et Stripe (mocks)."""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

User = get_user_model()


@override_settings(
    DEBUG=True,
    PREMIUM_DEMO_ALLOWED=True,
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "apps.users.authentication.AfrichessJWTAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
        "DEFAULT_THROTTLE_CLASSES": [],
    },
)
class SubscriptionDemoTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="sub_demo", password="x")
        self.client.force_authenticate(user=self.user)

    def test_demo_subscribe_gold(self):
        resp = self.client.post("/api/users/subscription/subscribe/", {"plan": "gold"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["mode"], "demo")
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_premium)

    @patch("apps.users.stripe_service.stripe_enabled", return_value=True)
    @patch("apps.users.stripe_service.create_checkout_session")
    def test_stripe_checkout_when_configured(self, mock_checkout, _enabled):
        mock_checkout.return_value = {
            "mode": "stripe",
            "checkout_url": "https://checkout.stripe.test/session",
        }
        resp = self.client.post("/api/users/subscription/subscribe/", {"plan": "gold"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["mode"], "stripe")
        self.assertIn("checkout.stripe", resp.data["checkout_url"])


@override_settings(DEBUG=True, PREMIUM_DEMO_ALLOWED=True)
class StripeWebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="stripe_wh", password="x", email="s@test.com")

    @patch("apps.users.views.handle_webhook")
    def test_webhook_ok(self, mock_handle):
        mock_handle.return_value = ({"type": "checkout.session.completed"}, None)
        resp = self.client.post(
            "/api/users/subscription/webhook/",
            b"{}",
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="sig_test",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["received"])

    @patch("apps.users.views.handle_webhook")
    def test_webhook_error(self, mock_handle):
        mock_handle.return_value = (None, "invalid signature")
        resp = self.client.post(
            "/api/users/subscription/webhook/",
            b"{}",
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    @patch("apps.users.stripe_service.activate_plan")
    @patch("apps.users.stripe_service._client")
    def test_handle_webhook_checkout_completed(self, mock_client, mock_activate):
        mock_client.return_value = MagicMock()
        mock_client.return_value.Webhook.construct_event.return_value = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "metadata": {"plan": "gold", "user_id": str(self.user.id)},
                }
            },
        }
        from apps.users.stripe_service import handle_webhook

        with patch("apps.users.stripe_service.STRIPE_WEBHOOK_SECRET", "whsec_test"):
            event, err = handle_webhook(b"{}", "sig")
        self.assertIsNone(err)
        self.assertEqual(event["type"], "checkout.session.completed")
        mock_activate.assert_called_once()
