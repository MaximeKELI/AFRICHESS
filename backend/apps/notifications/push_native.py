"""Envoi push natif — Expo (APNs/FCM) et Web Push (VAPID)."""

from __future__ import annotations

import json
import logging
from typing import Any

import requests
from django.conf import settings

from .models import DeviceToken, Notification

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _expo_headers() -> dict[str, str]:
    headers = {"Accept": "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json"}
    token = getattr(settings, "EXPO_ACCESS_TOKEN", "") or ""
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _notification_payload(notification: Notification) -> dict[str, Any]:
    data = dict(notification.data or {})
    data.setdefault("notification_id", notification.pk)
    data.setdefault("type", notification.type)
    return {
        "title": notification.title,
        "body": notification.body or "",
        "data": data,
    }


def send_expo_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> None:
    if not tokens:
        return
    payload_data = data or {}
    messages = [
        {
            "to": t,
            "title": title,
            "body": body,
            "data": payload_data,
            "sound": "default",
            "priority": "high",
            "channelId": "default",
        }
        for t in tokens
    ]
    try:
        resp = requests.post(EXPO_PUSH_URL, json=messages, headers=_expo_headers(), timeout=15)
        resp.raise_for_status()
        tickets = resp.json().get("data") or []
        for ticket, token in zip(tickets, tokens):
            if ticket.get("status") == "error":
                err = (ticket.get("details") or {}).get("error", "")
                if err in ("DeviceNotRegistered", "InvalidCredentials", "MessageTooBig"):
                    DeviceToken.objects.filter(token=token, kind=DeviceToken.Kind.EXPO).update(is_active=False)
                    logger.info("Deactivated invalid Expo token %s…", token[:24])
    except Exception:
        logger.exception("send_expo_push failed")


def send_web_push(subscriptions: list[dict], title: str, body: str, data: dict | None = None) -> None:
    private_key = getattr(settings, "VAPID_PRIVATE_KEY", "") or ""
    contact = getattr(settings, "VAPID_CONTACT", "") or "mailto:admin@africhess.com"
    if not private_key or not subscriptions:
        return
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("pywebpush not installed — web push skipped")
        return

    payload = json.dumps({"title": title, "body": body, "data": data or {}})
    for sub in subscriptions:
        endpoint = sub.get("endpoint", "")
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=private_key,
                vapid_claims={"sub": contact},
                timeout=10,
            )
        except WebPushException as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                DeviceToken.objects.filter(token=endpoint, kind=DeviceToken.Kind.WEBPUSH).update(is_active=False)
            logger.warning("webpush failed for %s: %s", endpoint[:40], exc)
        except Exception:
            logger.exception("webpush unexpected error")


def deliver_notification_push(notification: Notification) -> None:
    """Envoie la notification aux appareils enregistrés de l'utilisateur."""
    if not getattr(settings, "PUSH_NOTIFICATIONS_ENABLED", True):
        return

    tokens = list(
        DeviceToken.objects.filter(user_id=notification.user_id, is_active=True).values(
            "token", "kind", "subscription_json"
        )
    )
    if not tokens:
        return

    payload = _notification_payload(notification)
    expo_tokens = [t["token"] for t in tokens if t["kind"] == DeviceToken.Kind.EXPO]
    web_subs = [
        t["subscription_json"]
        for t in tokens
        if t["kind"] == DeviceToken.Kind.WEBPUSH and t["subscription_json"]
    ]

    send_expo_push(expo_tokens, payload["title"], payload["body"], payload["data"])
    send_web_push(web_subs, payload["title"], payload["body"], payload["data"])

    DeviceToken.objects.filter(
        user_id=notification.user_id,
        is_active=True,
        token__in=[t["token"] for t in tokens],
    ).update(last_used_at=notification.created_at)
