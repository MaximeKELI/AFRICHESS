#!/usr/bin/env python
"""Smoke tests API live — matchmaking, défi, DM notif, avatars."""
from __future__ import annotations

import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.games.models import Game, MatchmakingQueue
from apps.games.services import MatchmakingService
from apps.games.tests.mm_test_utils import reset_matchmaking_state
from apps.notifications.models import Notification
from apps.social.models import ChatMessage
from apps.users.avatar_utils import uploaded_avatar_url

User = get_user_model()


def ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def fail(msg: str) -> None:
    print(f"  ✗ {msg}")
    raise AssertionError(msg)


def ensure_user(username: str, password: str = "testpass123") -> "User":
    user, created = User.objects.get_or_create(
        username=username,
        defaults={"email": f"{username}@test.local"},
    )
    if created:
        user.set_password(password)
        user.avatar_preset = "avatar-2"
        user.save()
    return user


def test_avatar_preset_api() -> None:
    print("\n[Avatars]")
    user = ensure_user("smoke_avatar")
    user.avatar_preset = "avatar-3"
    user.save()
    client = APIClient()
    client.force_authenticate(user)
    res = client.get("/api/users/profile/")
    assert res.status_code == 200, res.data
    assert res.data.get("avatar_preset") == "avatar-3", res.data
    assert uploaded_avatar_url(user) is None or isinstance(uploaded_avatar_url(user), str)
    ok("avatar_preset exposé sur /api/users/profile/")


def test_matchmaking_pairing() -> None:
    print("\n[Matchmaking]")
    reset_matchmaking_state()
    a = ensure_user("smoke_mm_a")
    b = ensure_user("smoke_mm_b")
    svc = MatchmakingService()
    svc.join_queue(a, "blitz", 1200, is_rated=False, time_control="3+2")
    svc.join_queue(b, "blitz", 1250, is_rated=False, time_control="3+2")
    svc.pair_all_waiting()
    if MatchmakingQueue.objects.count() != 0:
        fail("pair_all_waiting n'a pas vidé la file")
    if Game.objects.filter(white_player=a, black_player=b).exists() or Game.objects.filter(
        white_player=b, black_player=a
    ).exists():
        ok("deux joueurs appariés (ELO proches)")
    else:
        fail("partie non créée après pairing")

    reset_matchmaking_state()
    c = ensure_user("smoke_mm_far")
    svc.join_queue(a, "blitz", 800, is_rated=False, time_control="3+2")
    svc.join_queue(c, "blitz", 2000, is_rated=False, time_control="3+2")
    svc.pair_all_waiting()
    if MatchmakingQueue.objects.count() == 2:
        ok("ELO trop éloignés → pas d'appariement auto")
    else:
        fail("appariement inattendu pour ELO très éloignés")


def test_challenge_endpoint() -> None:
    print("\n[Défi direct]")
    challenger = ensure_user("smoke_challenger")
    opponent = ensure_user("smoke_opponent")
    client = APIClient()
    client.force_authenticate(challenger)
    before = Game.objects.filter(white_player=challenger, black_player=opponent).count()
    res = client.post(
        "/api/games/challenge/",
        {"username": opponent.username, "mode": "blitz", "is_rated": False},
        format="json",
    )
    assert res.status_code == 201, res.data
    assert "id" in res.data, res.data
    after = Game.objects.filter(white_player=challenger, black_player=opponent).count()
    if after <= before:
        fail("partie de défi non créée")
    notif = Notification.objects.filter(
        user=opponent, type=Notification.Type.GAME_INVITE
    ).order_by("-id").first()
    if not notif:
        fail("notification GAME_INVITE manquante")
    ok(f"défi créé (game {res.data['id']}) + notif adversaire")


def test_dm_notification() -> None:
    print("\n[Messages privés]")
    sender = ensure_user("smoke_dm_sender")
    receiver = ensure_user("smoke_dm_receiver")
    client = APIClient()
    client.force_authenticate(sender)
    before = Notification.objects.filter(
        user=receiver, type=Notification.Type.DIRECT_MESSAGE
    ).count()
    res = client.post(
        f"/api/social/messages/{receiver.username}/",
        {"message": "Test smoke notification"},
        format="json",
    )
    assert res.status_code == 201, res.data
    after = Notification.objects.filter(
        user=receiver, type=Notification.Type.DIRECT_MESSAGE
    ).count()
    if after <= before:
        fail("notification DIRECT_MESSAGE non créée")
    notif = Notification.objects.filter(
        user=receiver, type=Notification.Type.DIRECT_MESSAGE
    ).order_by("-id").first()
    assert notif.data.get("from_username") == sender.username
    ok("message envoyé + notification direct_message")

    client.force_authenticate(receiver)
    res2 = client.get("/api/notifications/")
    assert res2.status_code == 200
    items = res2.data if isinstance(res2.data, list) else res2.data.get("results", [])
    unread_dm = [n for n in items if n["type"] == "direct_message" and not n["is_read"]]
    if not unread_dm:
        fail("notification DM non visible dans la liste API")
    ok(f"{len(unread_dm)} notification(s) DM non lue(s) visible(s)")


def test_matchmaking_status_poll() -> None:
    print("\n[Poll statut matchmaking]")
    reset_matchmaking_state()
    u1 = ensure_user("smoke_poll_a")
    u2 = ensure_user("smoke_poll_b")
    MatchmakingService().join_queue(u1, "blitz", 1300, is_rated=False, time_control="3+2")
    MatchmakingService().join_queue(u2, "blitz", 1320, is_rated=False, time_control="3+2")
    client = APIClient()
    client.force_authenticate(u1)
    res = client.get("/api/games/matchmaking/status/")
    assert res.status_code == 200, res.data
    if MatchmakingQueue.objects.count() == 0:
        ok("poll status déclenche le pairing")
    else:
        fail("file non vidée après poll status")


def main() -> int:
    print("=== Smoke tests AFRICHESS ===")
    tests = [
        test_avatar_preset_api,
        test_matchmaking_pairing,
        test_challenge_endpoint,
        test_dm_notification,
        test_matchmaking_status_poll,
    ]
    passed = 0
    for fn in tests:
        try:
            fn()
            passed += 1
        except Exception as exc:
            print(f"  ✗ ÉCHEC: {exc}")
            return 1
    print(f"\n=== {passed}/{len(tests)} groupes OK ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
