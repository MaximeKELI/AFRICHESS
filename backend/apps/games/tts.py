"""Synthèse vocale serveur (espeak-ng) — secours Linux sans voix navigateur."""
from __future__ import annotations

import ctypes
import ctypes.util
import io
import logging
import shutil
import subprocess
import wave

logger = logging.getLogger(__name__)

MAX_TTS_CHARS = 1200
# Voix française plus douce (espeak-ng variants)
ESPEAK_VOICE = "fr+f2"
ESPEAK_RATE = 132
ESPEAK_PITCH = 42


def _pcm_to_wav(pcm: bytes, sample_rate: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm)
    return buf.getvalue()


def _synthesize_via_libespeak(text: str, *, lang: str = "fr") -> bytes | None:
    """Utilise libespeak-ng.so quand le binaire espeak-ng n'est pas installé."""
    lib_path = ctypes.util.find_library("espeak-ng")
    if not lib_path:
        return None
    try:
        lib = ctypes.CDLL(lib_path)
    except OSError as exc:
        logger.warning("libespeak-ng indisponible: %s", exc)
        return None

    AUDIO_OUTPUT_RETRIEVAL = 2
    samples = bytearray()

    synth_cb = ctypes.CFUNCTYPE(
        ctypes.c_int,
        ctypes.POINTER(ctypes.c_short),
        ctypes.c_int,
        ctypes.c_void_p,
    )

    @synth_cb
    def _callback(wav, numsamples, _events):
        if numsamples > 0 and wav:
            samples.extend(ctypes.string_at(wav, numsamples * 2))
        return 0

    try:
        rate = lib.espeak_Initialize(AUDIO_OUTPUT_RETRIEVAL, 500, None, 0)
        if rate <= 0:
            return None
        lib.espeak_SetSynthCallback(_callback)
        voice = lang if lang.startswith("fr") else "fr"
        if lib.espeak_SetVoiceByName(voice.encode()) != 0:
            lib.espeak_SetVoiceByName(b"fr")
        payload = text.encode("utf-8")
        uid = ctypes.c_uint(0)
        if lib.espeak_Synth(payload, len(payload), 0, 1, 0, 1, ctypes.byref(uid), None) != 0:
            return None
        lib.espeak_Synchronize()
    except (AttributeError, OSError) as exc:
        logger.warning("libespeak-ng synthèse échec: %s", exc)
        return None

    if not samples:
        return None
    return _pcm_to_wav(bytes(samples), rate)


def synthesize_wav(text: str, *, lang: str = "fr") -> bytes | None:
    """Génère un WAV via espeak-ng. Retourne None si indisponible."""
    cleaned = " ".join(text.split())[:MAX_TTS_CHARS].strip()
    if not cleaned:
        return None

    espeak = shutil.which("espeak-ng") or shutil.which("espeak")
    if espeak:
        voice = lang if lang.startswith("fr") else "fr"
        try:
            result = subprocess.run(
                [espeak, "-v", voice, "-s", "155", "-a", "200", "--stdout", cleaned],
                capture_output=True,
                timeout=12,
                check=False,
            )
        except (subprocess.TimeoutExpired, OSError) as exc:
            logger.warning("TTS espeak échec: %s", exc)
            return _synthesize_via_libespeak(cleaned, lang=lang)

        if result.returncode == 0 and result.stdout:
            return result.stdout
        logger.warning(
            "espeak stderr: %s",
            result.stderr.decode(errors="replace")[:200],
        )

    return _synthesize_via_libespeak(cleaned, lang=lang)
