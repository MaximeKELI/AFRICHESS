from django.test import SimpleTestCase
from unittest.mock import patch

from apps.games.tts import audio_content_type, synthesize_speech, synthesize_wav


class TtsTests(SimpleTestCase):
    def test_empty_text_returns_none(self):
        self.assertIsNone(synthesize_wav(""))
        self.assertIsNone(synthesize_wav("   "))
        self.assertIsNone(synthesize_speech(""))

    def test_audio_content_type_wav_and_mp3(self):
        self.assertEqual(audio_content_type(b"RIFF...."), "audio/wav")
        self.assertEqual(audio_content_type(b"ID3....."), "audio/mpeg")
        self.assertEqual(audio_content_type(b"\xff\xfb\x90\x00"), "audio/mpeg")

    @patch("apps.games.tts._run_async")
    def test_synthesize_uses_edge_tts_not_espeak_header(self, mock_run):
        # Fake MP3 frame header (no RIFF/espeak WAV)
        mock_run.return_value = b"\xff\xfb" + b"\x00" * 200
        result = synthesize_speech("Bonjour le coach")
        self.assertIsNotNone(result)
        data, ctype = result
        self.assertEqual(ctype, "audio/mpeg")
        self.assertNotEqual(data[:4], b"RIFF")
        self.assertTrue(mock_run.called)

    @patch("apps.games.tts._run_async", return_value=None)
    def test_no_espeak_fallback_when_edge_fails(self, _mock):
        self.assertIsNone(synthesize_speech("Bonjour"))
