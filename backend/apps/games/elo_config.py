"""ELO ↔ niveau ↔ force IA — source unique de vérité côté backend."""

from apps.users.models import User

# Aligné sur User.LEVEL_ELO et le frontend CHESS_LEVELS
LEVEL_ELO = dict(User.LEVEL_ELO)

MIN_AI_ELO = 100
MAX_AI_ELO = 5000
# Stockfish UCI_LimitStrength plafonne souvent vers 3190
STOCKFISH_UCI_MAX_ELO = 3190

# Paliers IA (alignés frontend AI_LEVELS)
AI_PRESET_ELOS = (250, 750, 1250, 1750, 2250, 2750, 3250, 4000)

# Curseur 1–20 → ELO (800 → 5000)
DIFFICULTY_STEPS = 20


def clamp_elo(elo: int) -> int:
    return max(MIN_AI_ELO, min(MAX_AI_ELO, int(elo)))


def difficulty_slider_to_elo(difficulty: int) -> int:
    """Curseur 1–20 → ELO linéaire entre 100 et 5000."""
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
    if e >= 500:
        return "Novice (500–1000)"
    return "Débutant (0–500)"


def get_user_elo(user, mode: str = "blitz") -> int:
    from apps.ratings.models import PlayerRating

    rating = PlayerRating.objects.filter(user=user, mode=mode).first()
    if rating:
        return rating.elo
    return user.initial_elo


def normalize_to_preset_elo(elo: int) -> int:
    """Mappe l'ELO joueur au palier IA correspondant (tranches 500)."""
    e = clamp_elo(elo)
    if e < 500:
        return 250
    if e < 1000:
        return 750
    if e < 1500:
        return 1250
    if e < 2000:
        return 1750
    if e < 2500:
        return 2250
    if e < 3000:
        return 2750
    if e < 3500:
        return 3250
    return 4000


def suggested_ai_elo_for_user(user, mode: str = "blitz") -> int:
    """Force IA de base recommandée selon le classement réel du joueur."""
    return normalize_to_preset_elo(get_user_elo(user, mode))


def resolve_ai_target_elo(
    user,
    mode: str = "blitz",
    difficulty: int | None = None,
    ai_elo: int | None = None,
) -> int:
    """
    ELO cible de l'IA.
    - ai_elo : choix direct du joueur (100–5000), prioritaire
    - difficulty : curseur 1–20
    - sinon : palier selon le classement réel du joueur
    """
    if ai_elo is not None:
        return clamp_elo(ai_elo)

    if difficulty is not None:
        return clamp_elo(difficulty_slider_to_elo(difficulty))

    return suggested_ai_elo_for_user(user, mode)


def elo_to_difficulty_label(elo: int) -> int:
    """Curseur 1–20 stocké sur Game.ai_difficulty (affichage)."""
    return elo_to_difficulty_slider(elo)


LEVEL_TO_DIFFICULTY = {
    "beginner": 1,
    "intermediate": 5,
    "advanced": 10,
    "expert": 14,
    "master": 17,
}
