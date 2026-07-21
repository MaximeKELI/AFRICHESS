#!/usr/bin/env python3
"""
Télécharge des portraits réels (Wikimedia Commons, CC) pour les 30 légendes bots.

Usage:
  python3 scripts/fetch_legend_portraits.py
  python3 scripts/fetch_legend_portraits.py --slug nelson-mandela --force
"""

from __future__ import annotations

import argparse
import io
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))

from apps.games.bot_catalog import LEGENDS  # noqa: E402

OUT = REPO / "frontend" / "public" / "avatars" / "bots"
SIZE = 440
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
UA = "AFRICHESS/1.0 (educational chess app)"
MIN_REAL_BYTES = 80_000

# Fichiers Commons vérifiés ou recherchés
COMMONS_FILES: dict[str, str] = {
    "magnus-carlsen": "Magnus_Carlsen_2019.jpg",
    "hikaru-nakamura": "Hikaru_Nakamura_(2024).jpg",
    "julien-song": "Julien_Song_(2023).jpg",
    "bassem-amin": "Bassem_Amin_2013.jpg",
    "kenny-solomon": "Kenny_Solomon_2014.jpg",
    "ahmed-adly": "Ahmed_Adly_2013.jpg",
    "amon-simutowe": "Amon_Simutowe_2007.jpg",
    "thomas-sankara": "Thomas_Sankara.jpg",
    "nelson-mandela": "Nelson_Mandela_1994.jpg",
    "malcolm-x": "Malcolm_X_1964_press_photo.jpg",
    "patrice-lumumba": "Patrice_Lumumba_(1960).jpg",
    "kwame-nkrumah": "Kwame_Nkrumah_(1961).jpg",
    "albert-einstein": "Albert_Einstein_Head.jpg",
    "robert-oppenheimer": "J._Robert_Oppenheimer_(1944).jpg",
    "desmond-tutu": "Archbishop-Tutu-medium.jpg",
    "miriam-makeba": "Miriam_Makeba_1969.jpg",
    "chinua-achebe": "Chinua_Achebe,_2008.jpg",
    "wole-soyinka": "Wole_Soyinka_(2015).jpg",
    "cheikh-anta-diop": "Cheikh_Anta_Diop.jpg",
    "leopold-senghor": "Leopold_Sedar_Senghor_1988.jpg",
    "haile-selassie": "Haile_Selassie_in_full_dress_1965.jpg",
    "ahmed-sekou-toure": "Ahmed_Sékou_Touré_1962.jpg",
    "marie-curie": "Marie_Curie_c._1920s.jpg",
    "ada-lovelace": "Ada_Lovelace_portrait.jpg",
    "frida-kahlo": "Frida_Kahlo,_by_Guillermo_Kahlo.jpg",
    "mansa-musa": "Mansa_Musa_on_the_Catalan_Atlas.jpg",
    "queen-nzinga": "Queen_Nzinga_1657.jpg",
}

SEARCH_QUERIES: dict[str, str] = {
    "maxime-keli": "Maxime Keli",
    "joachim-mouhamad": "Joachim Mouhamad chess",
    "blitzstream": "Kevin Bordi Blitzstream chess",
}


def _api(params: dict, retries: int = 5) -> dict:
    import json

    url = COMMONS_API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < retries - 1:
                time.sleep(6 * (attempt + 1))
                continue
            raise
    return {}


def _thumb_from_file(filename: str) -> str | None:
    data = _api(
        {
            "action": "query",
            "titles": f"File:{filename}",
            "prop": "imageinfo",
            "iiprop": "url|thumburl|mime",
            "iiurlwidth": SIZE,
        }
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        if page.get("missing"):
            return None
        for info in page.get("imageinfo") or []:
            mime = info.get("mime", "")
            if "svg" in mime:
                continue
            return info.get("thumburl") or info.get("url")
    return None


def _search_image(query: str) -> str | None:
    data = _api(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": f"filetype:bitmap {query}",
            "gsrnamespace": 6,
            "gsrlimit": 8,
            "prop": "imageinfo",
            "iiprop": "url|mime|thumburl",
            "iiurlwidth": SIZE,
        }
    )
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        for info in page.get("imageinfo") or []:
            mime = info.get("mime", "")
            if mime.startswith("image/") and "svg" not in mime:
                return info.get("thumburl") or info.get("url")
    return None


def _download(url: str, retries: int = 5) -> bytes:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 503) and attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    return b""


def _to_square_png(data: bytes, dest: Path) -> None:
    from PIL import Image

    img = Image.open(io.BytesIO(data)).convert("RGBA")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((512, 512), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)


def fetch_one(slug: str, name: str, force: bool) -> bool:
    dest = OUT / f"{slug}.png"
    if not force and dest.exists() and dest.stat().st_size >= MIN_REAL_BYTES:
        print(f"  · {slug}: déjà OK ({dest.stat().st_size // 1024} Ko)")
        return True

    url = None
    filename = COMMONS_FILES.get(slug)
    if filename:
        time.sleep(2.5)
        url = _thumb_from_file(filename)
    if not url:
        query = SEARCH_QUERIES.get(slug, name)
        time.sleep(2.5)
        url = _search_image(query)
    if not url:
        print(f"  ✗ {slug}: aucune image")
        return False

    try:
        raw = _download(url)
        _to_square_png(raw, dest)
        print(f"  ✓ {slug} → {dest.name} ({len(raw) // 1024} Ko)")
        time.sleep(1.5)
        return True
    except Exception as exc:
        print(f"  ✗ {slug}: {exc}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    legends = [b for b in LEGENDS if not args.slug or b["slug"] == args.slug]
    ok = sum(1 for b in legends if fetch_one(b["slug"], b["name"], args.force))
    print(f"\n{ok}/{len(legends)} portraits → {OUT}")


if __name__ == "__main__":
    main()
