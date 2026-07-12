#!/usr/bin/env python3
"""Synthèse audio (stdout) pour le route handler Next.js /api/tts — voix neurale."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from apps.games.tts import synthesize_speech  # noqa: E402


def main() -> int:
    text = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else sys.stdin.read().strip()
    if not text:
        return 1
    result = synthesize_speech(text)
    if not result:
        return 1
    data, _ctype = result
    sys.stdout.buffer.write(data)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
