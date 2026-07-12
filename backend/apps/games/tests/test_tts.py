from django.test import SimpleTestCase
from unittest.mock import AsyncMock, MagicMock, patch

from apps.games import tts as tts_module
from apps.games.tts import (
    DEFAULT_VOICE,
    FALLBACK_VOICES,
    audio_content_type,
    synthesize_speech,
    synthesize_wav,
)


class TtsTests(SimpleTestCase):
    def test_default_voice_is_neural_male_french(self):
        self.assertIn("Henri", DEFAULT_VOICE)
        self.assertIn("Neural", DEFAULT_VOICE)
        self.assertTrue(all("Neural" in v for v in FALLBACK_VOICES))

    def test_empty_text_returns_none(self):
        self.assertIsNone(synthesize_wav(""))
        self.assertIsNone(synthesize_wav("   "))
        self.assertIsNone(synthesize_speech(""))

    def test_audio_content_type_wav_and_mp3(self):
        self.assertEqual(audio_content_type(b"RIFF...."), "audio/wav")
        self.assertEqual(audio_content_type(b"ID3....."), "audio/mpeg")
        self.assertEqual(audio_content_type(b"\xff\xfb\x90\x00"), "audio/mpeg")

    @patch("apps.games.tts._run_async")
    def test_synthesize_returns_mp3_not_espeak_wav(self, mock_run):
        mock_run.return_value = b"\xff\xfb" + b"\x00" * 200
        result = synthesize_speech("Bonjour le coach")
        self.assertIsNotNone(result)
        data, ctype = result
        self.assertEqual(ctype, "audio/mpeg")
        self.assertNotEqual(data[:4], b"RIFF")

    @patch("apps.games.tts._run_async", return_value=None)
    def test_no_espeak_fallback_when_edge_fails(self, mock_run):
        self.assertIsNone(synthesize_speech("Bonjour"))
        mock_run.assert_called_once()

    @patch("apps.games.tts._run_async")
    def test_synthesize_wav_alias_returns_same_bytes(self, mock_run):
        payload = b"\xff\xfb" + b"\x01" * 128
        mock_run.return_value = payload
        self.assertEqual(synthesize_wav("Test"), payload)

    def test_module_has_no_espeak_synthesis(self):
        source = open(tts_module.__file__, encoding="utf-8").read()
        self.assertNotIn("espeak-ng", source)
        self.assertNotIn("subprocess.run", source)
        self.assertNotIn("libespeak", source)

    @patch("apps.games.tts._edge_tts_mp3", new_callable=AsyncMock)
    def test_synthesize_neural_tries_voices_in_order(self, mock_edge):
        mock_edge.side_effect = [None, b"\xff\xfb" + b"\x00" * 100]

        async def run():
            return await tts_module._synthesize_neural("Salut", list(FALLBACK_VOICES))

        import asyncio

        result = asyncio.run(run())
        self.assertIsNotNone(result)
        self.assertEqual(mock_edge.await_count, 2)
        self.assertEqual(mock_edge.await_args_list[0].args[1], FALLBACK_VOICES[0])

    def test_edge_tts_mp3_skips_non_audio_chunks(self):
        async def fake_stream():
            yield {"type": "WordBoundary", "data": b""}
            yield {"type": "audio", "data": b"\xff\xfb\x01\x02"}
            yield {"type": "audio", "data": b"\x03\x04"}

        comm = MagicMock()
        comm.stream = fake_stream
        with patch("edge_tts.Communicate", return_value=comm):
            import asyncio

            result = asyncio.run(tts_module._edge_tts_mp3("Bonjour", DEFAULT_VOICE))

        self.assertEqual(result, b"\xff\xfb\x01\x02\x03\x04")
