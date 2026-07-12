"""Tests approfondis Section 4 — Social (chat, block, clubs, forum, search)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.models import Game
from apps.social.chat_access import user_can_send_chat_message, user_can_view_chat_room
from apps.social.models import ChatMessage, Club, ForumPost, ForumPostLike, Friendship, UserFollow
from apps.social.relationships import friendship_row, is_blocked

User = get_user_model()


class BlockAndDmTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="blk_a", password="x")
        self.b = User.objects.create_user(username="blk_b", password="x")
        self.client = APIClient()

    def test_block_then_dm_forbidden(self):
        self.client.force_authenticate(self.a)
        r = self.client.post("/api/social/friends/block/blk_b/")
        self.assertEqual(r.status_code, 201)
        self.assertTrue(is_blocked(self.a, self.b))

        room = f"{min(self.a.id, self.b.id)}_{max(self.a.id, self.b.id)}"
        self.assertFalse(user_can_view_chat_room(self.a, "direct", room))
        self.assertFalse(user_can_send_chat_message(self.a, "direct", room))

        dm = self.client.post(
            "/api/social/messages/blk_b/",
            {"message": "hello"},
            format="json",
        )
        self.assertEqual(dm.status_code, 403)

        chat = self.client.post(
            f"/api/social/chat/direct/{room}/send/",
            {"message": "bypass"},
            format="json",
        )
        self.assertEqual(chat.status_code, 403)

    def test_unblock(self):
        Friendship.objects.create(
            from_user=self.a, to_user=self.b, status=Friendship.Status.BLOCKED
        )
        self.client.force_authenticate(self.a)
        r = self.client.post("/api/social/friends/unblock/blk_b/")
        self.assertEqual(r.status_code, 204)
        self.assertFalse(is_blocked(self.a, self.b))


class GameChatParticipantOnlyTests(TestCase):
    def setUp(self):
        self.w = User.objects.create_user(username="gc_w", password="x")
        self.b = User.objects.create_user(username="gc_b", password="x")
        self.spec = User.objects.create_user(username="gc_s", password="x")
        self.game = Game.objects.create(
            white_player=self.w,
            black_player=self.b,
            status=Game.Status.ACTIVE,
            started_at=timezone.now(),
        )
        self.client = APIClient()

    def test_spectator_can_read_but_not_send(self):
        room = str(self.game.id)
        self.assertTrue(user_can_view_chat_room(self.spec, "game", room))
        self.assertFalse(user_can_send_chat_message(self.spec, "game", room))
        self.assertTrue(user_can_send_chat_message(self.w, "game", room))

        self.client.force_authenticate(self.spec)
        denied = self.client.post(
            f"/api/social/chat/game/{room}/send/",
            {"message": "spam"},
            format="json",
        )
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(self.w)
        ok = self.client.post(
            f"/api/social/chat/game/{room}/send/",
            {"message": "gg"},
            format="json",
        )
        self.assertEqual(ok.status_code, 201)


class UserSearchPrivacyTests(TestCase):
    def setUp(self):
        self.me = User.objects.create_user(username="srch_me", password="x")
        self.other = User.objects.create_user(
            username="srch_ot", password="x", email="secret@example.com"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.me)

    def test_email_not_searchable(self):
        r = self.client.get("/api/social/users/search/", {"q": "secret@"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 0)

    def test_username_search_works(self):
        r = self.client.get("/api/social/users/search/", {"q": "srch_ot"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)


class ForumFeaturedAndLikeTests(TestCase):
    def setUp(self):
        self.u = User.objects.create_user(username="frm_u", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.u)

    def test_client_cannot_set_featured(self):
        r = self.client.post(
            "/api/social/forum/",
            {
                "title": "Hello world post",
                "body": "Body content here that is long enough.",
                "is_featured": True,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        post = ForumPost.objects.get(pk=r.data["id"])
        self.assertFalse(post.is_featured)

    def test_like_toggle(self):
        post = ForumPost.objects.create(
            author=self.u, title="T", body="Body content ok"
        )
        r1 = self.client.post(f"/api/social/forum/{post.pk}/like/")
        self.assertTrue(r1.data["liked"])
        self.assertEqual(r1.data["likes_count"], 1)
        r2 = self.client.post(f"/api/social/forum/{post.pk}/like/")
        self.assertFalse(r2.data["liked"])
        self.assertEqual(r2.data["likes_count"], 0)
        self.assertFalse(ForumPostLike.objects.filter(user=self.u, post=post).exists())


class ClubLeaveKickTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="cl_own", password="x")
        self.member = User.objects.create_user(username="cl_mem", password="x")
        self.club = Club.objects.create(
            name="Leave Club", slug="leave-club", owner=self.owner, is_public=True
        )
        self.club.members.add(self.owner, self.member)
        self.club.member_count = 2
        self.club.save(update_fields=["member_count"])
        self.client = APIClient()

    def test_member_can_leave(self):
        self.client.force_authenticate(self.member)
        r = self.client.post("/api/social/clubs/leave-club/leave/")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(self.club.members.filter(pk=self.member.pk).exists())
        self.club.refresh_from_db()
        self.assertEqual(self.club.member_count, 1)

    def test_owner_cannot_leave(self):
        self.client.force_authenticate(self.owner)
        r = self.client.post("/api/social/clubs/leave-club/leave/")
        self.assertEqual(r.status_code, 400)

    def test_owner_can_kick(self):
        self.client.force_authenticate(self.owner)
        r = self.client.post(
            "/api/social/clubs/leave-club/kick/",
            {"username": "cl_mem"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertFalse(self.club.members.filter(pk=self.member.pk).exists())


class FriendshipPriorityTests(TestCase):
    def test_blocked_wins_over_pending_duplicate(self):
        a = User.objects.create_user(username="prio_a", password="x")
        b = User.objects.create_user(username="prio_b", password="x")
        Friendship.objects.create(
            from_user=a, to_user=b, status=Friendship.Status.PENDING
        )
        Friendship.objects.create(
            from_user=b, to_user=a, status=Friendship.Status.BLOCKED
        )
        row = friendship_row(a, b)
        self.assertEqual(row.status, Friendship.Status.BLOCKED)


class ChatValidationTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="cv_a", password="x")
        self.b = User.objects.create_user(username="cv_b", password="x")
        self.client = APIClient()
        self.client.force_authenticate(self.a)

    def test_rejects_script_tags(self):
        r = self.client.post(
            "/api/social/messages/cv_b/",
            {"message": "<script>alert(1)</script>"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(ChatMessage.objects.count(), 0)
