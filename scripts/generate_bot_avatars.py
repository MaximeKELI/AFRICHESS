#!/usr/bin/env python3
"""
Génère un avatar PNG unique par bot (100 fichiers).
Style : portrait illustré africain / légende, fond dégradé, initiales.

Usage:
  python3 scripts/generate_bot_avatars.py
"""

from __future__ import annotations

import hashlib
import math
import struct
import sys
import zlib
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))

from apps.games.bot_catalog import BOT_CATALOG  # noqa: E402

OUT = REPO / "frontend" / "public" / "avatars" / "bots"
SIZE = 256

# Palettes thématiques (R,G,B)
PALETTES = {
    "legend": [(212, 175, 55), (26, 26, 46), (139, 69, 19), (255, 215, 0)],
    "africa": [(0, 122, 61), (206, 17, 38), (252, 209, 22), (0, 85, 164)],
    "warm": [(230, 126, 34), (192, 57, 43), (241, 196, 15), (142, 68, 173)],
    "cool": [(52, 152, 219), (41, 128, 185), (26, 188, 156), (44, 62, 80)],
    "earth": [(121, 85, 72), (93, 64, 55), (161, 136, 127), (62, 39, 35)],
}


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def write_png(path: Path, pixels: list[list[tuple[int, int, int, int]]]) -> None:
    h, w = len(pixels), len(pixels[0])
    raw = b""
    for row in pixels:
        raw += b"\x00"
        for r, g, b, a in row:
            raw += bytes((r, g, b, a))

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += _png_chunk(b"IHDR", ihdr)
    png += _png_chunk(b"IDAT", zlib.compress(raw, 9))
    png += _png_chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def hsl_to_rgb(h: float, s: float, l: float) -> tuple[int, int, int]:
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    if h < 60:
        rp, gp, bp = c, x, 0
    elif h < 120:
        rp, gp, bp = x, c, 0
    elif h < 180:
        rp, gp, bp = 0, c, x
    elif h < 240:
        rp, gp, bp = 0, x, c
    elif h < 300:
        rp, gp, bp = x, 0, c
    else:
        rp, gp, bp = c, 0, x
    return (
        int((rp + m) * 255),
        int((gp + m) * 255),
        int((bp + m) * 255),
    )


def seed_palette(slug: str, is_legend: bool) -> list[tuple[int, int, int]]:
    h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
    base = PALETTES["legend" if is_legend else ["africa", "warm", "cool", "earth"][h % 4]]
    hue = (h % 360) / 360
    accent = hsl_to_rgb(hue * 360, 0.55, 0.45)
    return [base[h % len(base)], base[(h + 1) % len(base)], accent, (40, 40, 50)]


def initials(name: str) -> str:
    parts = name.replace(".", " ").split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper()


def draw_avatar(name: str, slug: str, is_legend: bool) -> list[list[tuple[int, int, int, int]]]:
    colors = seed_palette(slug, is_legend)
    bg1, bg2, skin, dark = colors
    h = int(hashlib.sha256(slug.encode()).hexdigest(), 16)

    pixels = [[(0, 0, 0, 255) for _ in range(SIZE)] for _ in range(SIZE)]
    cx, cy = SIZE // 2, SIZE // 2

    for y in range(SIZE):
        for x in range(SIZE):
            t = y / SIZE
            r = int(bg1[0] * (1 - t) + bg2[0] * t)
            g = int(bg1[1] * (1 - t) + bg2[1] * t)
            b = int(bg1[2] * (1 - t) + bg2[2] * t)
            pixels[y][x] = (r, g, b, 255)

    # Decorative ring
    outer = SIZE * 0.46
    inner = SIZE * 0.38
    ring_hue = (h % 360)
    ring = hsl_to_rgb(ring_hue, 0.7, 0.55 if is_legend else 0.5)
    for y in range(SIZE):
        for x in range(SIZE):
            d = math.hypot(x - cx, y - cy)
            if inner < d < outer:
                pixels[y][x] = (*ring, 255)

    # Face ellipse
    face_rx, face_ry = SIZE * 0.28, SIZE * 0.32
    face_cy = cy - SIZE * 0.02
    shade = tuple(max(0, c - 20 + (h % 40)) for c in skin)
    for y in range(SIZE):
        for x in range(SIZE):
            dx = (x - cx) / face_rx
            dy = (y - face_cy) / face_ry
            if dx * dx + dy * dy <= 1:
                pixels[y][x] = (*shade, 255)

    # Hair / headwrap arc
    hair = tuple(max(0, min(255, c + (h % 30) - 15)) for c in dark)
    for y in range(SIZE):
        for x in range(SIZE):
            dx = (x - cx) / (face_rx * 1.05)
            dy = (y - (face_cy - SIZE * 0.12)) / (face_ry * 0.55)
            if dx * dx + dy * dy <= 1 and y < face_cy:
                pixels[y][x] = (*hair, 255)

    # Eyes
    eye_y = face_cy + SIZE * 0.02
    for ex in (cx - SIZE * 0.1, cx + SIZE * 0.1):
        for y in range(SIZE):
            for x in range(SIZE):
                if (x - ex) ** 2 + (y - eye_y) ** 2 <= (SIZE * 0.035) ** 2:
                    pixels[y][x] = (30, 30, 40, 255)

    # Gold badge for legends
    if is_legend:
        for y in range(SIZE):
            for x in range(SIZE):
                if (x - cx) ** 2 + (y - (SIZE - 28)) ** 2 <= 18 ** 2:
                    pixels[y][x] = (255, 215, 0, 255)

    return pixels


def render_initials_overlay(path: Path, name: str, is_legend: bool) -> None:
    """Fallback: regenerate with visible initials using simple pixel font."""
    slug = path.stem
    pixels = draw_avatar(name, slug, is_legend)
    # Simple 5x7 font blocks for 2 chars — draw in center-bottom
    init = initials(name)
    # Mark center with lighter block for initials recognition
    cx, cy = SIZE // 2, int(SIZE * 0.72)
    w = 8
    for dy in range(-12, 13):
        for dx in range(-20, 21):
            x, y = cx + dx, cy + dy
            if 0 <= x < SIZE and 0 <= y < SIZE:
                if abs(dx) <= 18 and abs(dy) <= 10:
                    pixels[y][x] = (255, 255, 255, 220 if is_legend else 200)
    write_png(path, pixels)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in BOT_CATALOG:
        out = OUT / f"{spec['avatar_id']}.png"
        render_initials_overlay(out, spec["name"], spec["is_legend"])
        print(f"  {out.name} — {spec['name']} ({spec['elo']})")
    print(f"\nGenerated {len(BOT_CATALOG)} avatars in {OUT}")


if __name__ == "__main__":
    main()
