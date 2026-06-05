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
}

LESSONS_EN: dict[str, dict[str, str]] = {
    "vol1-decouverte": {
        "01-histoire-echecs-afrique.md": "World and African chess history",
        "02-echiquier-pieces-objectif.md": "The board, pieces and goal of the game",
        "03-premiers-coups-regles.md": "First moves and essential rules",
        "04-ethique-fair-play.md": "Ethics, fair play and competitive spirit",
    },
}

# Vidéos YouTube éducatives (placeholder — remplacer par contenu AFRICHESS)
LESSON_VIDEOS: dict[str, str] = {
    "01-histoire-echecs-afrique.md": "https://www.youtube.com/watch?v=NAIQ9ZhiLCI",
    "02-echiquier-pieces-objectif.md": "https://www.youtube.com/watch?v=fKxG8KjHGGg",
    "13-italienne.md": "https://www.youtube.com/watch?v=1Z2M8Ek7OH8",
}
