"""Livre d'ouvertures d'AFRICHESS.

Les données proviennent du jeu de données open source Lichess
(https://github.com/lichess-org/chess-openings, licence CC0) et sont regénérées
par ``backend/scripts/build_openings_book.py`` dans ``data/openings_book.tsv``.

Le fichier contient ~3800 ouvertures avec, pour chaque ligne, la séquence de
coups SAN, le code ECO, le nom français et le nom anglais.

La reconnaissance se fait par « plus long préfixe » : on cherche la ligne nommée
la plus profonde qui correspond au début de la partie. Ainsi ``1. f4`` est
identifiée comme « Ouverture de l'oiseau » plutôt que renvoyée telle quelle.
"""

from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path

_BOOK_PATH = Path(__file__).resolve().parent / "data" / "openings_book.tsv"

# key (coups SAN normalisés séparés par des espaces) -> (eco, name_fr, name_en)
_BOOK: dict[str, tuple[str, str, str]] = {}
# séquence normalisée -> ensemble des coups SAN qui prolongent vers une ligne nommée
_CONTINUATIONS: dict[str, set[str]] = {}

_ROOT_CHILDREN = ["e4", "d4", "Nf3", "c4"]


def _norm(san: str) -> str:
    """Normalise un coup SAN (retire échec/mat et annotations)."""
    return san.replace("+", "").replace("#", "").replace("!", "").replace("?", "").strip()


def _load_book() -> None:
    if _BOOK or not _BOOK_PATH.exists():
        return
    with _BOOK_PATH.open(encoding="utf-8") as fh:
        reader = csv.reader(fh, delimiter="\t")
        header = next(reader, None)
        for row in reader:
            if len(row) < 4:
                continue
            key, eco, name_fr, name_en = row[0], row[1], row[2], row[3]
            _BOOK[key] = (eco, name_fr, name_en)
            moves = key.split(" ")
            for i, move in enumerate(moves):
                parent = " ".join(moves[:i])
                _CONTINUATIONS.setdefault(parent, set()).add(move)


_load_book()


def _normalized_moves(moves: list[str]) -> list[str]:
    return [_norm(m) for m in moves if _norm(m)]


def path_key_from_moves(moves: list[str]) -> str:
    """Clé normalisée d'une ligne (coups SAN séparés par des espaces)."""
    return " ".join(_normalized_moves(moves))


def _longest_named_prefix(norm_moves: list[str]) -> tuple[str, tuple[str, str, str]] | None:
    """Retourne (clé, entrée) de la ligne nommée la plus profonde correspondante."""
    for i in range(len(norm_moves), 0, -1):
        key = " ".join(norm_moves[:i])
        entry = _BOOK.get(key)
        if entry:
            return key, entry
    return None


@lru_cache(maxsize=2048)
def _lookup_cached(full_key: str, locale: str) -> tuple[str, str, str, tuple[str, ...]]:
    norm_moves = full_key.split(" ") if full_key else []
    match = _longest_named_prefix(norm_moves) if norm_moves else None

    if not norm_moves:
        children = list(_ROOT_CHILDREN)
    else:
        children = sorted(_CONTINUATIONS.get(full_key, set()))

    if match is None:
        if norm_moves:
            # Aucune ligne connue : on renvoie au moins le dernier coup joué.
            return norm_moves[-1], "", full_key, tuple(children)
        name = "Position initiale" if locale == "fr" else "Starting position"
        return name, "", "", tuple(children)

    _key, (eco, name_fr, name_en) = match
    name = name_fr if locale == "fr" else (name_en or name_fr)
    return name, eco, full_key, tuple(children)


def lookup_opening(moves: list[str], locale: str = "fr") -> dict:
    """Retourne nom, code ECO, coups de suite possibles et chemin d'une ligne."""
    full_key = path_key_from_moves(moves)
    name, eco, path, children = _lookup_cached(full_key, locale if locale == "fr" else "en")
    return {
        "name": name,
        "eco": eco,
        "children": list(children),
        "path": path,
    }
