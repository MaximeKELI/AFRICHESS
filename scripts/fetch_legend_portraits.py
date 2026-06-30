#!/usr/bin/env python3
"""
Télécharge des portraits réels (Wikimedia Commons, CC) pour les 30 légendes bots.

Usage:
  python3 scripts/fetch_legend_portraits.py
  python3 scripts/fetch_legend_portraits.py --slug magnus-carlsen
"""

from __future__ import annotations

import argparse
import io
import sys
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))

from apps.games.bot_catalog import LEGENDS  # noqa: E402

OUT = REPO / "frontend" / "public" / "avatars" / "bots"
SIZE = 512
COMMONS_API = "https://commons.wikimedia.org/w/api.php"

# Fichier Commons vérifié ou requête de recherche de repli
PORTRAITS: dict[str, str] = {
    "magnus-carlsen": "Magnus Carlsen 2019",
    "hikaru-nakamura": "Hikaru Nakamura",
    "julien-song": "Julien Song chess",
    "maxime-keli": "Maxime Keli",
    "joachim-mouhamad": "Joachim Mouhamad chess",
    "bassem-amin": "Bassem Amin chess",
    "kenny-solomon": "Kenny Solomon chess",
    "ahmed-adly": "Ahmed Adly chess",
    "thomas-sankara": "Thomas Sankara",
    "nelson-mandela": "Nelson Mandela 1994",
    "malcolm-x": "Malcolm X portrait",
    "patrice-lumumba": "Patrice Lumumba",
    "kwame-nkrumah": "Kwame Nkrumah",
    "mansa-musa": "Mansa Musa",
    "queen-nzinga": "Queen Nzinga",
    "albert-einstein": "Albert Einstein Head",
    "robert-oppenheimer": "J. Robert Oppenheimer",
    "amon-simutowe": "Amon Simutowe",
    "desmond-tutu": "Desmond Tutu",
    "miriam-makeba": "Miriam Makeba",
    "chinua-achebe": "Chinua Achebe",
    "wole-soyinka": "Wole Soyinka",
    "cheikh-anta-diop": "Cheikh Anta Diop",
    "leopold-senghor": "Léopold Sédar Senghor",
    "haile-selassie": "Haile Selassie",
    "ahmed-sekou-toure": "Ahmed Sékou Touré",
    "marie-curie": "Marie Curie 1920",
    "ada-lovelace": "Ada Lovelace portrait",
    "frida-kahlo": "Frida Kahlo",
}


def _api(params: dict) -> dict:
    url = COMMONS_API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers={"User-Agent": "AFRICHESS/1.0 (educational chess app)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        import json

        return json.loads(resp.read().decode())


def _search_image(query: str) -> str | None:
    data = _api(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": f'filetype:bitmap {query}',
            "gsrnamespace": 6,
            "gsrlimit": 5,
            "prop": "imageinfo",
            "iiprop": "url|mime",
            "iiurlwidth": SIZE,
        }
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        infos = page.get("imageinfo") or []
        for info in infos:
            mime = info.get("mime", "")
            if mime.startswith("image/") and "svg" not in mime:
                return info.get("thumburl") or info.get("url")
    return None


def _download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "AFRICHESS/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def _to_square_png(data: bytes, dest: Path) -> None:
    from PIL import Image

    img = Image.open(io.BytesIO(data)).convert("RGBA")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)


def fetch_one(slug: str, query: str) -> bool:
    url = _search_image(query)
    if not url:
        print(f"  ✗ {slug}: aucune image pour « {query} »")
        return False
    try:
        raw = _download(url)
        dest = OUT / f"{slug}.png"
        _to_square_png(raw, dest)
        print(f"  ✓ {slug} → {dest.name} ({len(raw) // 1024} Ko)")
        return True
    except Exception as exc:
        print(f"  ✗ {slug}: {exc}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="Une seule légende")
    args = parser.parse_args()

    legends = [b for b in LEGENDS if not args.slug or b["slug"] == args.slug]
    if not legends:
        print("Aucune légende trouvée.")
        sys.exit(1)

    ok = 0
    for bot in legends:
        slug = bot["slug"]
        query = PORTRAITS.get(slug, bot["name"])
        if fetch_one(slug, query):
            ok += 1

    print(f"\n{ok}/{len(legends)} portraits → {OUT}")
    if ok < len(legends):
        sys.exit(1)


if __name__ == "__main__":
    main()
