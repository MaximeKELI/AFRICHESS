from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class UsersApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="u1", password="TestPass123!")

    def test_register_creates_user(self):
        res = self.client.post(
            "/api/users/register/",
            {
                "username": "newbie",
                "email": "newbie@test.com",
                "password": "TestPass123!",
                "password_confirm": "TestPass123!",
                "country": "SN",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["username"], "newbie")

    def test_profile_requires_auth(self):
        res = self.client.get("/api/users/profile/")
        self.assertEqual(res.status_code, 401)
        self.client.force_authenticate(self.user)
        res2 = self.client.get("/api/users/profile/")
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data["username"], "u1")
