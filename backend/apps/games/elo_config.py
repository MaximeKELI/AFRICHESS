"""ELO ↔ niveau ↔ force IA — source unique de vérité côté backend."""

from apps.users.models import User

# Aligné sur User.LEVEL_ELO et le frontend CHESS_LEVELS
LEVEL_ELO = dict(User.LEVEL_ELO)

MIN_AI_ELO = 800
MAX_AI_ELO = 5000
# Stockfish UCI_LimitStrength plafonne souvent vers 3190
STOCKFISH_UCI_MAX_ELO = 3190

# Curseur 1–20 → ELO (800 → 5000)
DIFFICULTY_STEPS = 20


def clamp_elo(elo: int) -> int:
    return max(MIN_AI_ELO, min(MAX_AI_ELO, int(elo)))


def difficulty_slider_to_elo(difficulty: int) -> int:
    """Curseur 1–20 → ELO linéaire entre 800 et 5000."""
    d = min(max(difficulty, 1), DIFFICULTY_STEPS)
    if DIFFICULTY_STEPS <= 1:
        return MIN_AI_ELO
    span = MAX_AI_ELO - MIN_AI_ELO
    return int(MIN_AI_ELO + span * (d - 1) / (DIFFICULTY_STEPS - 1))


def elo_to_difficulty_slider(elo: int) -> int:
    """ELO → curseur 1–20 le plus proche."""
    e = clamp_elo(elo)
    span = MAX_AI_ELO - MIN_AI_ELO
    if span <= 0:
        return 10
    ratio = (e - MIN_AI_ELO) / span
    step = round(1 + ratio * (DIFFICULTY_STEPS - 1))
    return min(DIFFICULTY_STEPS, max(1, step))


def elo_strength_label(elo: int) -> str:
    e = clamp_elo(elo)
    if e >= 4800:
        return "Monstre (~5000)"
    if e >= 4000:
        return "Super GM"
    if e >= 3200:
        return "Grand maître"
    if e >= 2400:
        return "Maître"
    if e >= 2000:
        return "Expert"
    if e >= 1600:
        return "Club"
    if e >= 1200:
        return "Intermédiaire"
    return "Débutant"


def get_user_elo(user, mode: str = "blitz") -> int:
    from apps.ratings.models import PlayerRating

    rating = PlayerRating.objects.filter(user=user, mode=mode).first()
    if rating:
        return rating.elo
    return user.initial_elo


def resolve_ai_target_elo(
    user,
    mode: str = "blitz",
    difficulty: int | None = None,
    ai_elo: int | None = None,
) -> int:
    """
    ELO cible de l'IA.
    - ai_elo : choix direct du joueur (800–5000), prioritaire
    - difficulty : curseur 1–20
    - sinon : blend profil joueur
    """
    if ai_elo is not None:
        return clamp_elo(ai_elo)

    if difficulty is not None:
        return clamp_elo(difficulty_slider_to_elo(difficulty))

    user_elo = get_user_elo(user, mode)
    level_elo = LEVEL_ELO.get(user.chess_level, 1200)
    default_slider = difficulty_slider_to_elo(
        LEVEL_TO_DIFFICULTY.get(user.chess_level, 10)
    )

    blended = int(user_elo * 0.5 + level_elo * 0.3 + default_slider * 0.2)
    return clamp_elo(blended)


def elo_to_difficulty_label(elo: int) -> int:
    """Curseur 1–20 stocké sur Game.ai_difficulty (affichage)."""
    return elo_to_difficulty_slider(elo)


LEVEL_TO_DIFFICULTY = {
    "beginner": 3,
    "intermediate": 6,
    "advanced": 10,
    "expert": 14,
    "master": 17,
}
