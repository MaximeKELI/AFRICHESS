#!/usr/bin/env python3
"""Synthèse WAV (stdout) pour le route handler Next.js /api/tts."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from apps.games.tts import synthesize_wav  # noqa: E402


def main() -> int:
    text = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else sys.stdin.read().strip()
    if not text:
        return 1
    wav = synthesize_wav(text)
    if not wav:
        return 1
    sys.stdout.buffer.write(wav)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
