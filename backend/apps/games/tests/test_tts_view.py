from django.contrib.auth import get_user_model
from django.test import SimpleTestCase
from django.test.client import RequestFactory
from unittest.mock import patch

from apps.games.views import speech_tts


class SpeechTtsViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        User = get_user_model()
        self.user = User(username="coach", email="c@test.com")
        self.user.set_password("secret12345")
        self.user.save()

    @patch("apps.games.views.synthesize_wav")
    def test_post_returns_neural_mp3_content_type(self, mock_synth):
        mock_synth.return_value = b"\xff\xfb" + b"\x00" * 128
        request = self.factory.post(
            "/api/games/tts/",
            {"text": "Excellent coup."},
            content_type="application/json",
        )
        request.user = self.user
        response = speech_tts(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "audio/mpeg")
        self.assertGreater(len(response.content), 64)
        mock_synth.assert_called_once_with("Excellent coup.")

    @patch("apps.games.views.synthesize_wav", return_value=None)
    def test_unavailable_returns_503_not_espeak_message(self, _mock):
        request = self.factory.post(
            "/api/games/tts/",
            {"text": "Bonjour"},
            content_type="application/json",
        )
        request.user = self.user
        response = speech_tts(request)
        self.assertEqual(response.status_code, 503)
        body = response.data if hasattr(response, "data") else {}
        self.assertIn("neural", str(body.get("error", "")).lower())
        self.assertNotIn("espeak", str(body.get("error", "")).lower())
