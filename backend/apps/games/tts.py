"""Synthèse vocale serveur (espeak-ng) — secours Linux sans voix navigateur."""
from __future__ import annotations

import logging
import shutil
import subprocess

logger = logging.getLogger(__name__)

MAX_TTS_CHARS = 500


def synthesize_wav(text: str, *, lang: str = "fr") -> bytes | None:
    """Génère un WAV via espeak-ng. Retourne None si indisponible."""
    cleaned = " ".join(text.split())[:MAX_TTS_CHARS].strip()
    if not cleaned:
        return None

    espeak = shutil.which("espeak-ng") or shutil.which("espeak")
    if not espeak:
        logger.warning("espeak-ng introuvable — TTS serveur désactivé")
        return None

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
        return None

    if result.returncode != 0 or not result.stdout:
        logger.warning("espeak stderr: %s", result.stderr.decode(errors="replace")[:200])
        return None

    return result.stdout
