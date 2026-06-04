"""ELO ↔ niveau ↔ force IA — source unique de vérité côté backend."""

from apps.users.models import User

# Aligné sur User.LEVEL_ELO et le frontend CHESS_LEVELS
LEVEL_ELO = dict(User.LEVEL_ELO)

# Curseur 1–10 → ELO cible de l'IA
DIFFICULTY_TO_ELO = {
    1: 800,
    2: 950,
    3: 1100,
    4: 1200,
    5: 1350,
    6: 1600,
    7: 1750,
    8: 2000,
    9: 2150,
    10: 2200,
}

LEVEL_TO_DIFFICULTY = {
    "beginner": 2,
    "intermediate": 4,
    "advanced": 6,
    "expert": 8,
    "master": 10,
}


def clamp_elo(elo: int) -> int:
    return max(600, min(2800, int(elo)))


def get_user_elo(user, mode: str = "blitz") -> int:
    from apps.ratings.models import PlayerRating

    rating = PlayerRating.objects.filter(user=user, mode=mode).first()
    if rating:
        return rating.elo
    return user.initial_elo


def resolve_ai_target_elo(user, mode: str = "blitz", difficulty: int | None = None) -> int:
    """
    Calcule l'ELO de l'IA en combinant :
    - le classement réel du joueur (PlayerRating)
    - son niveau déclaré (chess_level)
    - le curseur difficulté 1–10 (optionnel)
    """
    user_elo = get_user_elo(user, mode)
    level_elo = LEVEL_ELO.get(user.chess_level, 1200)

    if difficulty is None:
        difficulty = LEVEL_TO_DIFFICULTY.get(user.chess_level, 5)

    slider_elo = DIFFICULTY_TO_ELO.get(min(max(difficulty, 1), 10), user_elo)

    # 50 % ELO joueur + 30 % niveau déclaré + 20 % curseur
    blended = int(user_elo * 0.5 + level_elo * 0.3 + slider_elo * 0.2)
    return clamp_elo(blended)


def elo_to_difficulty_label(elo: int) -> int:
    """Retourne le curseur 1–10 le plus proche d'un ELO."""
    closest = 5
    best_diff = 9999
    for d, e in DIFFICULTY_TO_ELO.items():
        if abs(e - elo) < best_diff:
            best_diff = abs(e - elo)
            closest = d
    return closest
