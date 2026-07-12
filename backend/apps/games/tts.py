"""Synthèse vocale serveur — voix neurale humaine (edge-tts), pas espeak."""
from __future__ import annotations

import asyncio
import logging
import os

logger = logging.getLogger(__name__)

MAX_TTS_CHARS = 1200

# Voix française masculine neurale (Microsoft Edge) — naturelle, pas robotique.
DEFAULT_VOICE = os.environ.get("AFRICHESS_TTS_VOICE", "fr-FR-HenriNeural")
# Secours féminin si Henri indisponible
FALLBACK_VOICES = (
    DEFAULT_VOICE,
    "fr-FR-AlainNeural",
    "fr-FR-DeniseNeural",
    "fr-FR-EloiseNeural",
)


def _run_async(coro):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    # Dans un event loop déjà actif (Daphne) : exécuter dans un thread dédié
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, coro).result(timeout=60)


async def _edge_tts_mp3(text: str, voice: str) -> bytes | None:
    try:
        import edge_tts
    except ImportError:
        logger.warning("edge-tts non installé — voix neurale indisponible")
        return None

    chunks: list[bytes] = []
    try:
        communicate = edge_tts.Communicate(text, voice)
        async for part in communicate.stream():
            if part.get("type") == "audio" and part.get("data"):
                chunks.append(part["data"])
    except Exception as exc:
        logger.warning("edge-tts échec (%s): %s", voice, exc)
        return None

    if not chunks:
        return None
    return b"".join(chunks)


def synthesize_speech(text: str, *, lang: str = "fr") -> tuple[bytes, str] | None:
    """Génère de l'audio neural.

    Retourne (bytes, content_type) — typiquement MP3 edge-tts.
    None si indisponible (pas de repli espeak : trop robotique).
    """
    cleaned = " ".join(text.split())[:MAX_TTS_CHARS].strip()
    if not cleaned:
        return None

    voices = list(dict.fromkeys(FALLBACK_VOICES))  # unique, ordre préservé
    if lang and not lang.startswith("fr"):
        voices = [DEFAULT_VOICE, *voices]

    for voice in voices:
        mp3 = _run_async(_edge_tts_mp3(cleaned, voice))
        if mp3 and len(mp3) > 64:
            return mp3, "audio/mpeg"
    return None


def synthesize_wav(text: str, *, lang: str = "fr") -> bytes | None:
    """Compat : retourne les bytes audio (MP3 neural). Nom historique."""
    result = synthesize_speech(text, lang=lang)
    if not result:
        return None
    return result[0]


def audio_content_type(data: bytes) -> str:
    """Détecte le type MIME à partir de l'en-tête."""
    if data[:4] == b"RIFF":
        return "audio/wav"
    if data[:3] == b"ID3" or data[:2] == b"\xff\xfb" or data[:2] == b"\xff\xf3":
        return "audio/mpeg"
    # edge-tts renvoie souvent du MPEG sans ID3
    if len(data) > 2 and data[0] == 0xFF and (data[1] & 0xE0) == 0xE0:
        return "audio/mpeg"
    return "audio/mpeg"
