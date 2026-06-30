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
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))

from apps.games.bot_catalog import LEGENDS  # noqa: E402

OUT = REPO / "frontend" / "public" / "avatars" / "bots"
SIZE = 512
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
UA = "AFRICHESS/1.0 (educational chess app; contact: dev@africhess.local)"

# URLs directes (évite le rate-limit de l'API de recherche)
DIRECT_URLS: dict[str, str] = {
    "magnus-carlsen": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Magnus_Carlsen_2019.jpg/512px-Magnus_Carlsen_2019.jpg",
    "hikaru-nakamura": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Hikaru_Nakamura_%282024%29.jpg/512px-Hikaru_Nakamura_%282024%29.jpg",
    "julien-song": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Julien_Song_%282023%29.jpg/512px-Julien_Song_%282023%29.jpg",
    "bassem-amin": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Bassem_Amin_2013.jpg/512px-Bassem_Amin_2013.jpg",
    "kenny-solomon": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Kenny_Solomon_2014.jpg/512px-Kenny_Solomon_2014.jpg",
    "ahmed-adly": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Ahmed_Adly_2013.jpg/512px-Ahmed_Adly_2013.jpg",
    "amon-simutowe": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Amon_Simutowe_2007.jpg/512px-Amon_Simutowe_2007.jpg",
    "thomas-sankara": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Thomas_Sankara.jpg/512px-Thomas_Sankara.jpg",
    "nelson-mandela": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Nelson_Mandela_1994.jpg/512px-Nelson_Mandela_1994.jpg",
    "malcolm-x": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Malcolm_X_1964_press_photo.jpg/512px-Malcolm_X_1964_press_photo.jpg",
    "patrice-lumumba": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Patrice_Lumumba_%281960%29.jpg/512px-Patrice_Lumumba_%281960%29.jpg",
    "kwame-nkrumah": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Kwame_Nkrumah_%281961%29.jpg/512px-Kwame_Nkrumah_%281961%29.jpg",
    "albert-einstein": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/512px-Albert_Einstein_Head.jpg",
    "robert-oppenheimer": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/J._Robert_Oppenheimer_%281944%29.jpg/512px-J._Robert_Oppenheimer_%281944%29.jpg",
    "desmond-tutu": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Archbishop-Tutu-medium.jpg/512px-Archbishop-Tutu-medium.jpg",
    "miriam-makeba": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Miriam_Makeba_1969.jpg/512px-Miriam_Makeba_1969.jpg",
    "chinua-achebe": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Chinua_Achebe%2C_2008.jpg/512px-Chinua_Achebe%2C_2008.jpg",
    "wole-soyinka": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Wole_Soyinka_%282015%29.jpg/512px-Wole_Soyinka_%282015%29.jpg",
    "cheikh-anta-diop": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cheikh_Anta_Diop.jpg/512px-Cheikh_Anta_Diop.jpg",
    "leopold-senghor": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Leopold_Sedar_Senghor_1988.jpg/512px-Leopold_Sedar_Senghor_1988.jpg",
    "haile-selassie": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Haile_Selassie_in_full_dress_1965.jpg/512px-Haile_Selassie_in_full_dress_1965.jpg",
    "ahmed-sekou-toure": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Ahmed_S%C3%A9kou_Tour%C3%A9_1962.jpg/512px-Ahmed_S%C3%A9kou_Tour%C3%A9_1962.jpg",
    "marie-curie": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Marie_Curie_c._1920s.jpg/512px-Marie_Curie_c._1920s.jpg",
    "ada-lovelace": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Ada_Lovelace_portrait.jpg/512px-Ada_Lovelace_portrait.jpg",
    "frida-kahlo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg/512px-Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg",
    "mansa-musa": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Mansa_Musa_on_the_Catalan_Atlas.jpg/512px-Mansa_Musa_on_the_Catalan_Atlas.jpg",
    "queen-nzinga": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Queen_Nzinga_1657.jpg/512px-Queen_Nzinga_1657.jpg",
}

SEARCH_QUERIES: dict[str, str] = {
    "maxime-keli": "Maxime Keli",
    "joachim-mouhamad": "Joachim Mouhamad chess",
}


def _api(params: dict, retries: int = 4) -> dict:
    import json

    url = COMMONS_API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as exc:
            if exc.code == 429 and attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    return {}


def _search_image(query: str) -> str | None:
    data = _api(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": f"filetype:bitmap {query}",
            "gsrnamespace": 6,
            "gsrlimit": 5,
            "prop": "imageinfo",
            "iiprop": "url|mime",
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


def _download(url: str, retries: int = 4) -> bytes:
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 503) and attempt < retries - 1:
                time.sleep(4 * (attempt + 1))
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
    img = img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)


def fetch_one(slug: str, name: str) -> bool:
    url = DIRECT_URLS.get(slug)
    if not url:
        query = SEARCH_QUERIES.get(slug, name)
        time.sleep(2)
        url = _search_image(query)
    if not url:
        print(f"  ✗ {slug}: aucune image")
        return False
    try:
        raw = _download(url)
        dest = OUT / f"{slug}.png"
        _to_square_png(raw, dest)
        print(f"  ✓ {slug} → {dest.name} ({len(raw) // 1024} Ko)")
        time.sleep(1)
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
        if fetch_one(bot["slug"], bot["name"]):
            ok += 1

    print(f"\n{ok}/{len(legends)} portraits → {OUT}")
    if ok < len(legends):
        sys.exit(1)


if __name__ == "__main__":
    main()
