#!/usr/bin/env python3
"""Génère le livre d'ouvertures d'AFRICHESS à partir du jeu de données Lichess.

Source : https://github.com/lichess-org/chess-openings (licence CC0), fichiers
``a.tsv`` … ``e.tsv`` (colonnes ``eco``, ``name``, ``pgn``).

Le script produit ``backend/apps/games/data/openings_book.tsv`` avec les colonnes :
``key`` (coups SAN normalisés séparés par des espaces), ``eco``, ``name_fr``,
``name_en``.

Utilisation ::

    python backend/scripts/build_openings_book.py            # télécharge les TSV
    python backend/scripts/build_openings_book.py /tmp/eco   # lit un dossier local

Le nom français est reconstruit à partir d'un dictionnaire de familles traduites
puis d'un remplacement mot-à-mot des termes techniques courants. Les noms propres
(personnes, lieux, variantes) sont conservés tels quels.
"""

from __future__ import annotations

import os
import re
import sys
import urllib.request
from pathlib import Path

RAW_BASE = "https://raw.githubusercontent.com/lichess-org/chess-openings/master"
TSV_FILES = ["a.tsv", "b.tsv", "c.tsv", "d.tsv", "e.tsv"]

OUT_PATH = Path(__file__).resolve().parent.parent / "apps" / "games" / "data" / "openings_book.tsv"
FRONTEND_OUT = (
    Path(__file__).resolve().parent.parent.parent
    / "frontend"
    / "src"
    / "lib"
    / "openingsBook.json"
)

# --- Traduction des familles d'ouvertures (partie avant le premier ":") -------
FAMILY_FR: dict[str, str] = {
    "Alekhine Defense": "Défense Alekhine",
    "Amar Opening": "Ouverture Amar",
    "Amazon Attack": "Attaque Amazone",
    "Amsterdam Attack": "Attaque d'Amsterdam",
    "Anderssen's Opening": "Ouverture Anderssen",
    "Australian Defense": "Défense australienne",
    "Barnes Defense": "Défense Barnes",
    "Barnes Opening": "Ouverture Barnes",
    "Basque Opening": "Ouverture basque",
    "Benko Gambit": "Gambit Benko",
    "Benko Gambit Accepted": "Gambit Benko accepté",
    "Benko Gambit Declined": "Gambit Benko refusé",
    "Benoni Defense": "Défense Benoni",
    "Bird Opening": "Ouverture de l'oiseau (Bird)",
    "Bishop's Opening": "Ouverture du fou",
    "Blackmar-Diemer Gambit": "Gambit Blackmar-Diemer",
    "Blackmar-Diemer Gambit Accepted": "Gambit Blackmar-Diemer accepté",
    "Blackmar-Diemer Gambit Declined": "Gambit Blackmar-Diemer refusé",
    "Blumenfeld Countergambit": "Contre-gambit Blumenfeld",
    "Blumenfeld Countergambit Accepted": "Contre-gambit Blumenfeld accepté",
    "Bogo-Indian Defense": "Défense bogo-indienne",
    "Bongcloud Attack": "Attaque Bongcloud",
    "Borg Defense": "Défense Borg",
    "Canard Opening": "Ouverture Canard",
    "Caro-Kann Defense": "Défense Caro-Kann",
    "Carr Defense": "Défense Carr",
    "Catalan Opening": "Ouverture catalane",
    "Center Game": "Partie du centre",
    "Center Game Accepted": "Partie du centre acceptée",
    "Clemenz Opening": "Ouverture Clemenz",
    "Colle System": "Système Colle",
    "Creepy Crawly Formation": "Formation Creepy-Crawly",
    "Czech Defense": "Défense tchèque",
    "Danish Gambit": "Gambit danois",
    "Danish Gambit Accepted": "Gambit danois accepté",
    "Danish Gambit Declined": "Gambit danois refusé",
    "Döry Defense": "Défense Döry",
    "Dresden Opening": "Ouverture de Dresde",
    "Duras Gambit": "Gambit Duras",
    "Dutch Defense": "Défense hollandaise",
    "East Indian Defense": "Défense est-indienne",
    "Elephant Gambit": "Gambit de l'éléphant",
    "English Defense": "Défense anglaise",
    "English Opening": "Ouverture anglaise",
    "English Orangutan": "Anglaise Orang-outan",
    "Englund Gambit": "Gambit Englund",
    "Englund Gambit Declined": "Gambit Englund refusé",
    "Formation": "Formation",
    "Four Knights Game": "Partie des quatre cavaliers",
    "French Defense": "Défense française",
    "Fried Fox Defense": "Défense Fried Fox",
    "Global Opening": "Ouverture Global",
    "Goldsmith Defense": "Défense Goldsmith",
    "Grob Opening": "Ouverture Grob",
    "Grünfeld Defense": "Défense Grünfeld",
    "Gunderam Defense": "Défense Gunderam",
    "Hippopotamus Defense": "Défense hippopotame",
    "Horwitz Defense": "Défense Horwitz",
    "Hungarian Opening": "Ouverture hongroise",
    "Indian Defense": "Défense indienne",
    "Irish Gambit": "Gambit irlandais",
    "Italian Game": "Partie italienne",
    "Kádas Opening": "Ouverture Kádas",
    "Kangaroo Defense": "Défense kangourou",
    "King's Gambit": "Gambit du roi",
    "King's Gambit Accepted": "Gambit du roi accepté",
    "King's Gambit Declined": "Gambit du roi refusé",
    "King's Indian Attack": "Attaque indienne du roi",
    "King's Indian Defense": "Défense indienne du roi",
    "King's Knight Opening": "Ouverture du cavalier-roi",
    "King's Pawn Game": "Partie du pion roi",
    "King's Pawn Opening": "Ouverture du pion roi",
    "Lasker Simul Special": "Spéciale simultanée Lasker",
    "Latvian Gambit": "Gambit letton",
    "Latvian Gambit Accepted": "Gambit letton accepté",
    "Lemming Defense": "Défense Lemming",
    "Lion Defense": "Défense Lion",
    "London System": "Système Londres",
    "Marienbad System": "Système Marienbad",
    "Mexican Defense": "Défense mexicaine",
    "Mieses Opening": "Ouverture Mieses",
    "Mikenas Defense": "Défense Mikenas",
    "Modern Defense": "Défense moderne",
    "Montevideo Defense": "Défense Montevideo",
    "Neo-Grünfeld Defense": "Défense néo-Grünfeld",
    "Nimzo-Indian Defense": "Défense nimzo-indienne",
    "Nimzo-Larsen Attack": "Attaque Nimzo-Larsen",
    "Nimzowitsch Defense": "Défense Nimzowitsch",
    "Old Indian Defense": "Ancienne défense indienne",
    "Owen Defense": "Défense Owen",
    "Paleface Attack": "Attaque Paleface",
    "Petrov's Defense": "Défense Petroff (russe)",
    "Philidor Defense": "Défense Philidor",
    "Pirc Defense": "Défense Pirc",
    "Polish Defense": "Défense polonaise",
    "Polish Opening": "Ouverture polonaise (Orang-outan)",
    "Ponziani Opening": "Ouverture Ponziani",
    "Portuguese Opening": "Ouverture portugaise",
    "Pseudo Queen's Indian Defense": "Pseudo-défense indienne de la dame",
    "Pterodactyl Defense": "Défense ptérodactyle",
    "Queen's Gambit": "Gambit dame",
    "Queen's Gambit Accepted": "Gambit dame accepté",
    "Queen's Gambit Declined": "Gambit dame refusé",
    "Queen's Indian Accelerated": "Indienne de la dame accélérée",
    "Queen's Indian Defense": "Défense indienne de la dame",
    "Queen's Pawn Game": "Partie du pion dame",
    "Rapport-Jobava System": "Système Rapport-Jobava",
    "Rat Defense": "Défense Rat",
    "Réti Opening": "Ouverture Réti",
    "Richter-Veresov Attack": "Attaque Richter-Veresov",
    "Robatsch Defense": "Défense Robatsch (moderne)",
    "Rubinstein Opening": "Ouverture Rubinstein",
    "Ruy Lopez": "Partie espagnole (Ruy López)",
    "Saragossa Opening": "Ouverture Saragosse",
    "Scandinavian Defense": "Défense scandinave",
    "Scotch Game": "Partie écossaise",
    "Semi-Slav Defense": "Défense semi-slave",
    "Semi-Slav Defense Accepted": "Défense semi-slave acceptée",
    "Sicilian Defense": "Défense sicilienne",
    "Slav Defense": "Défense slave",
    "Slav Indian": "Slave indienne",
    "Sodium Attack": "Attaque Sodium",
    "St. George Defense": "Défense Saint-Georges",
    "Tarrasch Defense": "Défense Tarrasch",
    "Three Knights Opening": "Ouverture des trois cavaliers",
    "Torre Attack": "Attaque Torre",
    "Trompowsky Attack": "Attaque Trompowsky",
    "Valencia Opening": "Ouverture Valence",
    "Van Geet Opening": "Ouverture Van Geet",
    "Van't Kruijs Opening": "Ouverture Van't Kruijs",
    "Vienna Game": "Partie viennoise",
    "Vulture Defense": "Défense Vautour",
    "Wade Defense": "Défense Wade",
    "Ware Defense": "Défense Ware",
    "Ware Opening": "Ouverture Ware",
    "Yusupov-Rubinstein System": "Système Yusupov-Rubinstein",
    "Zaire Defense": "Défense zaïroise",
    "Zukertort Defense": "Défense Zukertort",
    "Zukertort Opening": "Ouverture Zukertort",
}

# Remplacements mot-à-mot (termes techniques) appliqués aux variantes / restes.
# Ordre important : les expressions les plus longues d'abord.
GENERIC_FR: list[tuple[str, str]] = [
    ("Main Line", "ligne principale"),
    ("Two Knights", "deux cavaliers"),
    ("Three Knights", "trois cavaliers"),
    ("Four Knights", "quatre cavaliers"),
    ("Countergambit", "contre-gambit"),
    ("Counterattack", "contre-attaque"),
    ("Queenside", "aile dame"),
    ("Kingside", "aile roi"),
    ("Accepted", "accepté"),
    ("Declined", "refusé"),
    ("Refused", "refusé"),
    ("Deferred", "différé"),
    ("Delayed", "retardé"),
    ("Doubled", "doublé"),
    ("Variations", "variantes"),
    ("Variation", "variante"),
    ("Defenses", "défenses"),
    ("Defense", "défense"),
    ("Defences", "défenses"),
    ("Defence", "défense"),
    ("Attacks", "attaques"),
    ("Attack", "attaque"),
    ("Openings", "ouvertures"),
    ("Opening", "ouverture"),
    ("Gambits", "gambits"),
    ("Gambit", "gambit"),
    ("Systems", "systèmes"),
    ("System", "système"),
    ("Formation", "formation"),
    ("Classical", "classique"),
    ("Modern", "moderne"),
    ("Advance", "avancée"),
    ("Exchange", "échange"),
    ("Fianchetto", "fianchetto"),
    ("Knights", "cavaliers"),
    ("Knight", "cavalier"),
    ("Bishop", "fou"),
    ("Center", "centre"),
    ("Wing", "aile"),
    ("Reversed", "inversée"),
    ("Symmetric", "symétrique"),
    ("Symmetrical", "symétrique"),
    ("Asymmetrical", "asymétrique"),
    ("Hybrid", "hybride"),
    ("Quiet", "calme"),
    ("Early", "précoce"),
    ("Old", "ancienne"),
    ("Dutch", "hollandaise"),
    ("Polish", "polonaise"),
    ("English", "anglaise"),
    ("Indian", "indienne"),
    ("Spanish", "espagnole"),
    ("Italian", "italienne"),
    ("Russian", "russe"),
    ("French", "française"),
    ("Scandinavian", "scandinave"),
    ("Czech", "tchèque"),
    ("Danish", "danoise"),
    ("Hungarian", "hongroise"),
    ("Portuguese", "portugaise"),
    ("Swedish", "suédoise"),
    ("Norwegian", "norvégienne"),
    ("German", "allemande"),
    ("Austrian", "autrichienne"),
    ("with", "avec"),
    ("without", "sans"),
    ("Line", "ligne"),
]

# Mots-clés qui, en français, se placent en tête de la variante.
_TAIL_LEAD = {
    "variante",
    "variantes",
    "gambit",
    "gambits",
    "contre-gambit",
    "attaque",
    "attaques",
    "contre-attaque",
    "système",
    "systèmes",
    "défense",
    "défenses",
    "formation",
}


def _reorder_tail(text: str) -> str:
    words = text.split()
    if len(words) >= 2 and words[-1].lower() in _TAIL_LEAD:
        lead = words[-1].lower()
        rest = " ".join(words[:-1])
        return f"{lead.capitalize()} {rest}"
    return text


def _apply_generic(text: str) -> str:
    for en, fr in GENERIC_FR:
        text = re.sub(rf"\b{re.escape(en)}\b", fr, text)
    return text


def _translate_head(head: str) -> str:
    head = head.strip()
    if head in FAMILY_FR:
        return FAMILY_FR[head]
    # Familles suivies d'une précision « , with ... »
    if "," in head:
        base, rest = head.split(",", 1)
        base = base.strip()
        base_fr = FAMILY_FR.get(base, _apply_generic(base))
        return f"{base_fr}, {_reorder_tail(_apply_generic(rest.strip()))}"
    return _apply_generic(head)


def translate_name(name_en: str) -> str:
    if ":" in name_en:
        head, tail = name_en.split(":", 1)
        parts = [_reorder_tail(_apply_generic(p.strip())) for p in tail.split(",")]
        return f"{_translate_head(head)} : {', '.join(parts)}"
    return _translate_head(name_en)


def sans_from_pgn(pgn: str) -> list[str]:
    out: list[str] = []
    for tok in pgn.split():
        if re.fullmatch(r"\d+\.+", tok):
            continue
        san = tok.replace("+", "").replace("#", "").strip()
        if san:
            out.append(san)
    return out


def load_rows(src_dir: Path | None) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for fname in TSV_FILES:
        if src_dir is not None:
            text = (src_dir / fname).read_text(encoding="utf-8")
        else:
            url = f"{RAW_BASE}/{fname}"
            print(f"  téléchargement {url}")
            with urllib.request.urlopen(url) as resp:  # noqa: S310
                text = resp.read().decode("utf-8")
        for line in text.splitlines():
            if not line or line.startswith("eco\t"):
                continue
            parts = line.split("\t")
            if len(parts) < 3:
                continue
            eco, name, pgn = parts[0], parts[1], parts[2]
            rows.append((eco, name, pgn))
    return rows


def main() -> None:
    src_dir: Path | None = None
    if len(sys.argv) > 1:
        src_dir = Path(sys.argv[1])
    elif os.path.isdir("/tmp/eco"):
        src_dir = Path("/tmp/eco")

    rows = load_rows(src_dir)
    book: dict[str, tuple[str, str, str]] = {}
    for eco, name_en, pgn in rows:
        sans = sans_from_pgn(pgn)
        if not sans:
            continue
        key = " ".join(sans)
        name_fr = translate_name(name_en)
        # En cas de doublon de ligne, on garde le nom le plus court (ligne mère).
        if key in book:
            prev = book[key][2]
            if len(name_en) >= len(prev):
                continue
        book[key] = (eco, name_fr, name_en)

    ordered = sorted(book, key=lambda k: (k.count(" "), k))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as fh:
        fh.write("key\teco\tname_fr\tname_en\n")
        for key in ordered:
            eco, name_fr, name_en = book[key]
            fh.write(f"{key}\t{eco}\t{name_fr}\t{name_en}\n")
    print(f"{len(book)} ouvertures écrites dans {OUT_PATH}")

    # Version compacte pour le frontend : [key, eco, name_fr, name_en].
    import json

    FRONTEND_OUT.parent.mkdir(parents=True, exist_ok=True)
    # Le sidebar « live » n'a besoin que des premières lignes : on plafonne la
    # profondeur pour limiter la taille du bundle (Game Review utilise l'API
    # backend qui, elle, exploite le livre complet).
    max_plies = 10
    payload = [
        [key, book[key][0], book[key][1], book[key][2]]
        for key in ordered
        if key.count(" ") + 1 <= max_plies
    ]
    with FRONTEND_OUT.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(payload)} ouvertures écrites dans {FRONTEND_OUT}")


if __name__ == "__main__":
    main()
