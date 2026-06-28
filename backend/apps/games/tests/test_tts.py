from django.test import SimpleTestCase

from apps.games.tts import synthesize_wav


class TtsTests(SimpleTestCase):
    def test_empty_text_returns_none(self):
        self.assertIsNone(synthesize_wav(""))
        self.assertIsNone(synthesize_wav("   "))

    def test_synthesize_or_skip_without_espeak(self):
        result = synthesize_wav("Bonjour")
        if result is not None:
            self.assertTrue(result[:4] == b"RIFF")
