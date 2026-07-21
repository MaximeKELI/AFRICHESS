#!/usr/bin/env python3
"""
Génère un avatar PNG unique par bot (100 fichiers).
Style : portrait illustré avec initiales, palettes par légende.

Usage:
  python3 scripts/generate_bot_avatars.py

Pour remplacer un avatar par une photo réelle :
  python3 scripts/fetch_legend_portraits.py
  # ou copier manuellement vers frontend/public/avatars/bots/{slug}.png
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

# Palettes par légende (bg1, bg2, skin, hair/accent)
LEGEND_THEMES: dict[str, tuple[tuple[int, int, int], ...]] = {
    "magnus-carlsen": ((15, 52, 96), (30, 90, 150), (240, 220, 200), (50, 50, 60)),
    "hikaru-nakamura": ((120, 20, 30), (200, 40, 50), (255, 220, 190), (30, 30, 35)),
    "thomas-sankara": ((0, 100, 50), (200, 30, 40), (120, 80, 50), (40, 30, 20)),
    "nelson-mandela": ((0, 122, 61), (252, 209, 22), (90, 60, 40), (30, 30, 30)),
    "malcolm-x": ((20, 20, 20), (60, 60, 60), (80, 55, 40), (10, 10, 10)),
    "albert-einstein": ((60, 60, 80), (100, 100, 130), (240, 225, 200), (180, 180, 190)),
    "robert-oppenheimer": ((40, 30, 50), (80, 60, 90), (220, 200, 180), (50, 40, 30)),
    "maxime-keli": ((0, 100, 60), (212, 175, 55), (70, 50, 35), (25, 25, 35)),
    "blitzstream": ((20, 20, 40), (255, 180, 0), (240, 210, 180), (30, 30, 40)),
    "julien-song": ((0, 50, 120), (200, 30, 40), (255, 225, 200), (60, 40, 30)),
    "joachim-mouhamad": ((0, 90, 50), (252, 200, 20), (90, 65, 45), (35, 25, 20)),
    "patrice-lumumba": ((200, 30, 40), (252, 209, 22), (85, 55, 38), (30, 20, 15)),
    "kwame-nkrumah": ((206, 17, 38), (0, 100, 50), (95, 60, 42), (25, 20, 15)),
    "mansa-musa": ((212, 175, 55), (139, 90, 20), (75, 50, 30), (40, 25, 10)),
    "queen-nzinga": ((150, 30, 60), (212, 175, 55), (110, 75, 55), (40, 20, 30)),
    "miriam-makeba": ((180, 40, 80), (252, 209, 22), (100, 70, 50), (50, 30, 40)),
    "marie-curie": ((80, 40, 100), (140, 80, 160), (255, 230, 210), (60, 40, 50)),
    "frida-kahlo": ((200, 50, 60), (0, 130, 100), (190, 130, 90), (30, 20, 15)),
}

PALETTES = {
    "africa": [(0, 122, 61), (206, 17, 38), (252, 209, 22), (40, 40, 50)],
    "warm": [(230, 126, 34), (192, 57, 43), (180, 130, 90), (50, 35, 25)],
    "cool": [(52, 152, 219), (41, 128, 185), (200, 180, 160), (35, 45, 55)],
    "earth": [(121, 85, 72), (161, 136, 127), (150, 110, 80), (45, 35, 30)],
}

# 5x7 pixel font (bits per row, MSB left)
_FONT: dict[str, list[int]] = {
    "A": [0x70, 0x88, 0x88, 0xF8, 0x88, 0x88, 0x88],
    "B": [0xF0, 0x88, 0x88, 0xF0, 0x88, 0x88, 0xF0],
    "C": [0x70, 0x88, 0x80, 0x80, 0x80, 0x88, 0x70],
    "D": [0xF0, 0x88, 0x88, 0x88, 0x88, 0x88, 0xF0],
    "E": [0xF8, 0x80, 0x80, 0xF0, 0x80, 0x80, 0xF8],
    "F": [0xF8, 0x80, 0x80, 0xF0, 0x80, 0x80, 0x80],
    "G": [0x70, 0x88, 0x80, 0xB8, 0x88, 0x88, 0x70],
    "H": [0x88, 0x88, 0x88, 0xF8, 0x88, 0x88, 0x88],
    "I": [0x70, 0x20, 0x20, 0x20, 0x20, 0x20, 0x70],
    "J": [0x38, 0x10, 0x10, 0x10, 0x10, 0x90, 0x60],
    "K": [0x88, 0x90, 0xA0, 0xC0, 0xA0, 0x90, 0x88],
    "L": [0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0xF8],
    "M": [0x88, 0xD8, 0xA8, 0xA8, 0x88, 0x88, 0x88],
    "N": [0x88, 0xC8, 0xA8, 0x98, 0x88, 0x88, 0x88],
    "O": [0x70, 0x88, 0x88, 0x88, 0x88, 0x88, 0x70],
    "P": [0xF0, 0x88, 0x88, 0xF0, 0x80, 0x80, 0x80],
    "Q": [0x70, 0x88, 0x88, 0x88, 0xA8, 0x90, 0x68],
    "R": [0xF0, 0x88, 0x88, 0xF0, 0xA0, 0x90, 0x88],
    "S": [0x70, 0x88, 0x80, 0x70, 0x08, 0x88, 0x70],
    "T": [0xF8, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20],
    "U": [0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x70],
    "V": [0x88, 0x88, 0x88, 0x88, 0x88, 0x50, 0x20],
    "W": [0x88, 0x88, 0x88, 0xA8, 0xA8, 0xD8, 0x88],
    "X": [0x88, 0x88, 0x50, 0x20, 0x50, 0x88, 0x88],
    "Y": [0x88, 0x88, 0x50, 0x20, 0x20, 0x20, 0x20],
    "Z": [0xF8, 0x08, 0x10, 0x20, 0x40, 0x80, 0xF8],
    " ": [0] * 7,
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


def palette_for(slug: str, is_legend: bool) -> tuple[tuple[int, int, int], ...]:
    if slug in LEGEND_THEMES:
        return LEGEND_THEMES[slug]
    h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
    key = ["africa", "warm", "cool", "earth"][h % 4]
    return tuple(PALETTES[key])


def initials(name: str) -> str:
    parts = [p for p in name.replace(".", " ").split() if p and p[0].isalpha()]
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return (parts[0][:2] if parts else "??").upper()


def draw_char(
    pixels: list,
    ch: str,
    ox: int,
    oy: int,
    scale: int,
    color: tuple[int, int, int, int],
) -> None:
    rows = _FONT.get(ch.upper(), _FONT["?"] if "?" in _FONT else _FONT["A"])
    for row_i, row in enumerate(rows):
        for col in range(5):
            if row & (0x10 >> col):
                for dy in range(scale):
                    for dx in range(scale):
                        x, y = ox + col * scale + dx, oy + row_i * scale + dy
                        if 0 <= x < SIZE and 0 <= y < SIZE:
                            pixels[y][x] = color


def draw_initials(
    pixels: list,
    text: str,
    color: tuple[int, int, int],
    y_frac: float = 0.68,
) -> None:
    scale = 5 if len(text) <= 2 else 4
    char_w = 6 * scale
    total_w = len(text) * char_w - scale
    ox = (SIZE - total_w) // 2
    oy = int(SIZE * y_frac)
    rgba = (*color, 255)
    # dark shadow
    for i, ch in enumerate(text):
        draw_char(pixels, ch, ox + i * char_w + 2, oy + 2, scale, (0, 0, 0, 180))
    for i, ch in enumerate(text):
        draw_char(pixels, ch, ox + i * char_w, oy, scale, rgba)


def draw_avatar(name: str, slug: str, is_legend: bool) -> list[list[tuple[int, int, int, int]]]:
    bg1, bg2, skin, hair = palette_for(slug, is_legend)
    h = int(hashlib.sha256(slug.encode()).hexdigest(), 16)
    pixels = [[(0, 0, 0, 255) for _ in range(SIZE)] for _ in range(SIZE)]
    cx, cy = SIZE // 2, SIZE // 2 - 8

    # Gradient background
    for y in range(SIZE):
        for x in range(SIZE):
            t = y / SIZE
            pixels[y][x] = (
                int(bg1[0] * (1 - t) + bg2[0] * t),
                int(bg1[1] * (1 - t) + bg2[1] * t),
                int(bg1[2] * (1 - t) + bg2[2] * t),
                255,
            )

    # Outer ring
    for y in range(SIZE):
        for x in range(SIZE):
            d = math.hypot(x - cx, y - cy)
            if SIZE * 0.44 < d < SIZE * 0.48:
                pixels[y][x] = (255, 215, 0, 255) if is_legend else (255, 255, 255, 120)

    # Face
    face_rx, face_ry = SIZE * 0.26, SIZE * 0.30
    face_cy = cy
    shade = tuple(max(0, min(255, c + (h % 30) - 15)) for c in skin)
    for y in range(SIZE):
        for x in range(SIZE):
            dx, dy = (x - cx) / face_rx, (y - face_cy) / face_ry
            if dx * dx + dy * dy <= 1:
                pixels[y][x] = (*shade, 255)

    # Hair / headwear
    for y in range(SIZE):
        for x in range(SIZE):
            dx = (x - cx) / (face_rx * 1.08)
            dy = (y - (face_cy - SIZE * 0.10)) / (face_ry * 0.50)
            if dx * dx + dy * dy <= 1 and y < face_cy + 5:
                pixels[y][x] = (*hair, 255)

    # Eyes
    eye_y = face_cy + SIZE * 0.04
    for ex in (cx - SIZE * 0.09, cx + SIZE * 0.09):
        for y in range(SIZE):
            for x in range(SIZE):
                if (x - ex) ** 2 + (y - eye_y) ** 2 <= (SIZE * 0.028) ** 2:
                    pixels[y][x] = (25, 25, 35, 255)

    # Legend crown (simple triangles)
    if is_legend:
        crown_y = 18
        for i, dx in enumerate([-24, 0, 24]):
            tip_x, tip_y = cx + dx, crown_y
            base_y = crown_y + 14
            for y in range(tip_y, base_y + 1):
                span = int((y - tip_y) * 2.5) + 2
                for x in range(cx + dx - span, cx + dx + span + 1):
                    if 0 <= x < SIZE and 0 <= y < SIZE:
                        pixels[y][x] = (255, 215, 0, 255)

    init = initials(name)
    text_color = (255, 255, 255) if is_legend else (240, 240, 245)
    draw_initials(pixels, init, text_color)

    return pixels


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in BOT_CATALOG:
        out = OUT / f"{spec['avatar_id']}.png"
        pixels = draw_avatar(spec["name"], spec["slug"], spec["is_legend"])
        write_png(out, pixels)
        tag = "★" if spec["is_legend"] else " "
        print(f"{tag} {out.name:30} {spec['name']:22} {spec['elo']}")
    print(f"\n✓ {len(BOT_CATALOG)} avatars → {OUT}")
    print("  Remplacer un fichier PNG pour utiliser un portrait IA personnalisé.")


if __name__ == "__main__":
    main()
