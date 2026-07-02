"""Métadonnées EN pour cours et leçons (titres + descriptions)."""

COURSES_EN: dict[str, dict] = {
    "vol1-decouverte": {
        "title": "Volume 1 — Discovering Chess",
        "description": "Origins, African culture, first contact with the board and player mindset.",
    },
    "vol2-notation-regles": {
        "title": "Volume 2 — Notation & Full Rules",
        "description": "Algebraic notation, special moves, draws and arbiting.",
    },
    "vol3-principes-fondamentaux": {
        "title": "Volume 3 — Fundamental Principles",
        "description": "Center, development, king safety, pawns and opening plans.",
    },
    "vol4-ouvertures-1": {
        "title": "Volume 4 — Openings (part 1)",
        "description": "Classical white systems and a basic repertoire.",
    },
    "vol11-tactique-avancee": {
        "title": "Volume 11 — Advanced Tactics",
        "description": "Sacrifices, zwischenzug, tactical prophylaxis and complex mates.",
    },
    "vol12-finales-avancees": {
        "title": "Volume 12 — Advanced Endgames",
        "description": "Bishop vs knight, rook pawns and active queen endings.",
    },
    "vol13-repertoire-competitif": {
        "title": "Volume 13 — Competitive Repertoire",
        "description": "Build, prepare and adapt your repertoire in competition.",
    },
    "vol14-entrainement-performance": {
        "title": "Volume 14 — Training & Performance",
        "description": "Planning, engine analysis, resilience and tournament fitness.",
    },
    "vol15-leadership-africain": {
        "title": "Volume 15 — African Chess Leadership",
        "description": "Clubs, arbiting, mentoring and continental ecosystem vision.",
    },
}

LESSONS_EN: dict[str, dict[str, str]] = {
    "vol1-decouverte": {
        "01-histoire-echecs-afrique.md": "World and African chess history",
        "02-echiquier-pieces-objectif.md": "The board, pieces and goal of the game",
        "03-premiers-coups-regles.md": "First moves and essential rules",
        "04-ethique-fair-play.md": "Ethics, fair play and competitive spirit",
    },
    "vol11-tactique-avancee": {
        "41-deviations-sacrifices.md": "Deflections and positional sacrifices",
        "42-zwischenzug.md": "Zwischenzug and in-between moves",
        "43-prophylaxie-tactique.md": "Advanced tactical prophylaxis",
        "44-mats-complexes.md": "Complex mating combinations",
    },
    "vol15-leadership-africain": {
        "60-vision-africhess.md": "AFRICHESS vision and the continental scene",
    },
}

# Vidéos YouTube éducatives (placeholder — remplacer par contenu AFRICHESS)
LESSON_VIDEOS: dict[str, str] = {
    "01-histoire-echecs-afrique.md": "https://www.youtube.com/watch?v=NAIQ9ZhiLCI",
    "02-echiquier-pieces-objectif.md": "https://www.youtube.com/watch?v=fKxG8KjHGGg",
    "13-italienne.md": "https://www.youtube.com/watch?v=1Z2M8Ek7OH8",
}
