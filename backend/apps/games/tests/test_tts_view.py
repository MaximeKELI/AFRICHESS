from django.test import SimpleTestCase
from unittest.mock import MagicMock, patch

from rest_framework.test import APIRequestFactory, force_authenticate

from apps.games.views import speech_tts


class SpeechTtsViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = MagicMock(is_authenticated=True)

    @patch("apps.games.views.synthesize_wav")
    def test_post_returns_neural_mp3_content_type(self, mock_synth):
        mock_synth.return_value = b"\xff\xfb" + b"\x00" * 128
        request = self.factory.post("/api/games/tts/", {"text": "Excellent coup."}, format="json")
        force_authenticate(request, user=self.user)
        response = speech_tts(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "audio/mpeg")
        self.assertGreater(len(response.content), 64)
        mock_synth.assert_called_once_with("Excellent coup.")

    @patch("apps.games.views.synthesize_wav", return_value=None)
    def test_unavailable_returns_503_not_espeak_message(self, _mock):
        request = self.factory.post("/api/games/tts/", {"text": "Bonjour"}, format="json")
        force_authenticate(request, user=self.user)
        response = speech_tts(request)
        self.assertEqual(response.status_code, 503)
        self.assertIn("neural", str(response.data.get("error", "")).lower())
        self.assertNotIn("espeak", str(response.data.get("error", "")).lower())
