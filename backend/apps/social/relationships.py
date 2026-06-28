"""État relationnel entre joueurs (amis, abonnements, blocage)."""

from __future__ import annotations

from django.db.models import Q

from .models import Friendship, UserFollow


def friendship_row(user_a, user_b) -> Friendship | None:
    if not user_a or not user_b or user_a.id == user_b.id:
        return None
    return (
        Friendship.objects.filter(
            Q(from_user=user_a, to_user=user_b) | Q(from_user=user_b, to_user=user_a)
        )
        .select_related("from_user", "to_user")
        .first()
    )


def _are_friends(user_a, user_b) -> bool:
    row = friendship_row(user_a, user_b)
    return row is not None and row.status == Friendship.Status.ACCEPTED


def _is_blocked(user_a, user_b) -> bool:
    row = friendship_row(user_a, user_b)
    return row is not None and row.status == Friendship.Status.BLOCKED


def are_friends(user_a, user_b) -> bool:
    return _are_friends(user_a, user_b)


def is_blocked(user_a, user_b) -> bool:
    return _is_blocked(user_a, user_b)


def friendship_status_for(viewer, target) -> str:
    if viewer is None or target is None or viewer.id == target.id:
        return "self" if viewer and target and viewer.id == target.id else "none"

    row = friendship_row(viewer, target)
    if not row:
        return "none"
    if row.status == Friendship.Status.BLOCKED:
        return "blocked"
    if row.status == Friendship.Status.ACCEPTED:
        return "friends"
    if row.status == Friendship.Status.PENDING:
        if row.from_user_id == viewer.id:
            return "pending_sent"
        return "pending_received"
    return "none"


def relationship_payload(viewer, target) -> dict:
    status = friendship_status_for(viewer, target)
    row = friendship_row(viewer, target) if viewer and target and viewer.id != target.id else None
    blocked = status == "blocked"

    followers_count = 0
    following_count = 0
    is_following = False
    is_followed_by = False

    if target:
        followers_count = UserFollow.objects.filter(following=target).count()
        following_count = UserFollow.objects.filter(follower=target).count()
    if viewer and target and viewer.id != target.id:
        is_following = UserFollow.objects.filter(follower=viewer, following=target).exists()
        is_followed_by = UserFollow.objects.filter(follower=target, following=viewer).exists()

    return {
        "friendship_status": status,
        "friendship_id": row.id if row else None,
        "is_following": is_following,
        "is_followed_by": is_followed_by,
        "followers_count": followers_count,
        "following_count": following_count,
        "can_message": not blocked,
        "can_friend": status in ("none", "pending_sent"),
    }
