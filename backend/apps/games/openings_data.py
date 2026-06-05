"""Livre d'ouvertures simplifié (arbre de lignes principales)."""

from __future__ import annotations

OPENING_TREE: dict[str, dict] = {
    "": {
        "name_fr": "Position initiale",
        "name_en": "Starting position",
        "children": {
            "e4": "e4",
            "d4": "d4",
            "Nf3": "Nf3",
            "c4": "c4",
        },
    },
    "e4": {
        "name_fr": "Ouverture du roi",
        "name_en": "King's Pawn",
        "eco": "B00",
        "children": {"e5": "e4_e5", "c5": "e4_c5", "e6": "e4_e6", "c6": "e4_c6", "d5": "e4_d5", "Nf6": "e4_Nf6"},
    },
    "e4_e5": {
        "name_fr": "Partie ouverte",
        "name_en": "Open Game",
        "eco": "C20",
        "children": {"Nf3": "e4_e5_Nf3", "Bc4": "e4_e5_Bc4", "f4": "e4_e5_f4"},
    },
    "e4_e5_Nf3": {
        "name_fr": "Défense des deux cavaliers",
        "name_en": "Two Knights Defense",
        "eco": "C55",
        "children": {"Nc6": "e4_e5_Nf3_Nc6", "Nf6": "e4_e5_Nf3_Nf6"},
    },
    "e4_e5_Nf3_Nc6": {
        "name_fr": "Partie italienne",
        "name_en": "Italian Game",
        "eco": "C50",
        "children": {"Bc4": "italian", "Bb5": "ruy_lopez"},
    },
    "italian": {
        "name_fr": "Ouverture italienne",
        "name_en": "Italian Game",
        "eco": "C50",
        "children": {},
    },
    "ruy_lopez": {
        "name_fr": "Partie espagnole (Ruy López)",
        "name_en": "Ruy López",
        "eco": "C60",
        "children": {},
    },
    "e4_c5": {
        "name_fr": "Défense sicilienne",
        "name_en": "Sicilian Defense",
        "eco": "B20",
        "children": {"Nf3": "e4_c5_Nf3", "c3": "e4_c5_c3"},
    },
    "e4_c5_Nf3": {
        "name_fr": "Sicilienne — variante principale",
        "name_en": "Sicilian — main line",
        "eco": "B30",
        "children": {"d6": "sicilian_najdorf", "Nc6": "sicilian_nc6"},
    },
    "sicilian_najdorf": {
        "name_fr": "Sicilienne Najdorf",
        "name_en": "Sicilian Najdorf",
        "eco": "B90",
        "children": {},
    },
    "e4_e6": {
        "name_fr": "Défense française",
        "name_en": "French Defense",
        "eco": "C00",
        "children": {"d4": "french_main"},
    },
    "french_main": {
        "name_fr": "Française — échange",
        "name_en": "French — main line",
        "eco": "C01",
        "children": {},
    },
    "e4_c6": {
        "name_fr": "Défense caro-kann",
        "name_en": "Caro-Kann Defense",
        "eco": "B10",
        "children": {},
    },
    "d4": {
        "name_fr": "Ouverture de la dame",
        "name_en": "Queen's Pawn",
        "eco": "D00",
        "children": {"d5": "d4_d5", "Nf6": "d4_Nf6", "f5": "d4_f5"},
    },
    "d4_d5": {
        "name_fr": "Gambit de la dame refusé",
        "name_en": "Queen's Gambit Declined",
        "eco": "D30",
        "children": {"c4": "qgd"},
    },
    "qgd": {
        "name_fr": "Gambit de la dame",
        "name_en": "Queen's Gambit",
        "eco": "D06",
        "children": {},
    },
    "d4_Nf6": {
        "name_fr": "Défense indienne",
        "name_en": "Indian Defense",
        "eco": "A40",
        "children": {"c4": "indian_c4", "Nf3": "indian_nf3"},
    },
    "indian_c4": {
        "name_fr": "Indienne du roi",
        "name_en": "King's Indian",
        "eco": "E60",
        "children": {"g6": "kings_indian"},
    },
    "kings_indian": {
        "name_fr": "Indienne du roi — classique",
        "name_en": "King's Indian — classical",
        "eco": "E90",
        "children": {},
    },
    "Nf3": {
        "name_fr": "Ouverture Réti",
        "name_en": "Réti Opening",
        "eco": "A04",
        "children": {"d5": "reti_d5", "Nf6": "reti_Nf6"},
    },
    "c4": {
        "name_fr": "Ouverture anglaise",
        "name_en": "English Opening",
        "eco": "A10",
        "children": {"e5": "english_e5", "Nf6": "english_Nf6"},
    },
}


def _san_key(san: str) -> str:
    return san.replace("+", "").replace("#", "").strip()[:6]


def path_key_from_moves(moves: list[str]) -> str:
    """Parcourt l'arbre selon les coups SAN."""
    if not moves:
        return ""
    key = ""
    for san in moves:
        sk = _san_key(san)
        if not key:
            key = sk
            continue
        parent = OPENING_TREE.get(key, {})
        child_key = parent.get("children", {}).get(sk)
        key = child_key if child_key else f"{key}_{sk}"
    return key


def lookup_opening(moves: list[str], locale: str = "fr") -> dict:
    """Retourne nom, ECO, enfants possibles pour une ligne."""
    path = path_key_from_moves(moves)
    node = OPENING_TREE.get(path)
    if not node:
        # Repli : chercher le préfixe le plus long
        parts = path.split("_") if path else []
        while parts:
            parts.pop()
            candidate = "_".join(parts)
            node = OPENING_TREE.get(candidate)
            if node:
                break
    if not node:
        if moves:
            return {
                "name": moves[-1],
                "eco": "",
                "children": [],
                "path": path,
            }
        return {
            "name": "Position initiale" if locale == "fr" else "Starting position",
            "eco": "",
            "children": list(OPENING_TREE[""]["children"].keys()),
            "path": "",
        }

    name = node.get("name_fr") if locale == "fr" else node.get("name_en", node.get("name_fr", ""))
    children_sans = list(node.get("children", {}).keys())
    return {
        "name": name,
        "eco": node.get("eco", ""),
        "children": children_sans,
        "path": path,
    }
