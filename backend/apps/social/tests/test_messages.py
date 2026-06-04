from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.social.models import ChatMessage, Friendship

User = get_user_model()


class DirectMessageApiTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="dma", password="x")
        self.b = User.objects.create_user(username="dmb", password="x")
        Friendship.objects.create(from_user=self.a, to_user=self.b, status=Friendship.Status.ACCEPTED)
        self.client = APIClient()

    def test_send_and_list_direct_messages(self):
        self.client.force_authenticate(self.a)
        res = self.client.post(
            "/api/social/messages/dmb/",
            {"message": "Salut !"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        res2 = self.client.get("/api/social/messages/dmb/")
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(len(res2.data), 1)
        self.assertEqual(res2.data[0]["content"], "Salut !")
        self.assertEqual(
            ChatMessage.objects.filter(room_type=ChatMessage.RoomType.DIRECT).count(),
            1,
        )
