"""Paliers bots style Chess.com — Débutant → Élite."""

from __future__ import annotations

from typing import TypedDict


class BotTier(TypedDict):
    id: str
    min_elo: int
    max_elo: int
    label_fr: str
    label_en: str
    description_fr: str
    description_en: str
    # Elo moteur recommandé pour le sélecteur de force
    preset_elo: int


# Aligné sur aiStrength.ts / Chess.com (Beginner → Elite)
BOT_TIERS: list[BotTier] = [
    {
        "id": "beginner",
        "min_elo": 0,
        "max_elo": 599,
        "label_fr": "Débutant",
        "label_en": "Beginner",
        "description_fr": "Découverte des règles et premiers coups",
        "description_en": "Learn the rules and first moves",
        "preset_elo": 250,
    },
    {
        "id": "novice",
        "min_elo": 600,
        "max_elo": 999,
        "label_fr": "Novice",
        "label_en": "Novice",
        "description_fr": "Bases tactiques et ouvertures simples",
        "description_en": "Basic tactics and simple openings",
        "preset_elo": 750,
    },
    {
        "id": "intermediate",
        "min_elo": 1000,
        "max_elo": 1399,
        "label_fr": "Intermédiaire",
        "label_en": "Intermediate",
        "description_fr": "Niveau club amateur",
        "description_en": "Club amateur level",
        "preset_elo": 1250,
    },
    {
        "id": "club",
        "min_elo": 1400,
        "max_elo": 1799,
        "label_fr": "Club",
        "label_en": "Club Player",
        "description_fr": "Bon joueur de club",
        "description_en": "Strong club player",
        "preset_elo": 1750,
    },
    {
        "id": "advanced",
        "min_elo": 1800,
        "max_elo": 2199,
        "label_fr": "Confirmé",
        "label_en": "Advanced",
        "description_fr": "Tournois et plans stratégiques",
        "description_en": "Tournament play and strategy",
        "preset_elo": 2250,
    },
    {
        "id": "expert",
        "min_elo": 2200,
        "max_elo": 2499,
        "label_fr": "Expert",
        "label_en": "Expert",
        "description_fr": "Peu d'erreurs, pression constante",
        "description_en": "Few mistakes, constant pressure",
        "preset_elo": 2750,
    },
    {
        "id": "master",
        "min_elo": 2500,
        "max_elo": 2899,
        "label_fr": "Maître",
        "label_en": "Master",
        "description_fr": "Force maître international",
        "description_en": "International master strength",
        "preset_elo": 3250,
    },
    {
        "id": "elite",
        "min_elo": 2900,
        "max_elo": 9999,
        "label_fr": "Élite",
        "label_en": "Elite",
        "description_fr": "Super-GM et légendes",
        "description_en": "Super-GM and legends",
        "preset_elo": 4000,
    },
]

# Elo max battu pour débloquer jusqu'à ce palier (+ marge)
START_UNLOCK_ELO = 800
UNLOCK_MARGIN = 150


def tier_for_elo(elo: int) -> BotTier:
    for tier in BOT_TIERS:
        if tier["min_elo"] <= elo <= tier["max_elo"]:
            return tier
    return BOT_TIERS[-1]


def tier_id_for_elo(elo: int) -> str:
    return tier_for_elo(elo)["id"]


def unlock_ceiling(max_beaten_elo: int) -> int:
    """Elo max des bots accessibles (style Chess.com)."""
    return max(START_UNLOCK_ELO, int(max_beaten_elo) + UNLOCK_MARGIN)
