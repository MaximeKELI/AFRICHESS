"""Coach personnalisé — conseils automatiques en français."""

from apps.puzzles.models import PuzzleAttempt
from apps.users.models import UserStats

from .models import LearningProfile, UserProgress


def generate_coach_tips(user) -> list[dict]:
    tips = []
    stats = getattr(user, "stats", None)
    profile = LearningProfile.objects.filter(user=user).first()

    if stats:
        if stats.games_played >= 5 and stats.win_rate < 40:
            tips.append({
                "category": "parties",
                "message": "Ton taux de victoire est bas. Révise les finales et évite les coups précipités.",
                "priority": 2,
            })
        if stats.puzzles_solved < 5 and stats.games_played >= 3:
            tips.append({
                "category": "tactiques",
                "message": "Travaille davantage les tactiques : les puzzles améliorent la vision combinatoire.",
                "priority": 1,
            })

    if profile:
        if profile.puzzle_accuracy and profile.puzzle_accuracy < 50 and profile.puzzles_attempted >= 5:
            tips.append({
                "category": "tactiques",
                "message": "Ta précision aux puzzles est faible. Prends plus de temps avant de valider.",
                "priority": 1,
            })
        if profile.puzzles_solved_learning >= 20:
            tips.append({
                "category": "tactiques",
                "message": "Excellent travail tactique ! Passe aux cours de niveau intermédiaire.",
                "priority": 3,
            })

    # Thèmes faibles via tentatives ratées
    failed = (
        PuzzleAttempt.objects.filter(user=user, solved=False)
        .select_related("puzzle")
        .order_by("-created_at")[:20]
    )
    theme_miss = {}
    for att in failed:
        for theme in att.puzzle.themes or []:
            theme_miss[theme] = theme_miss.get(theme, 0) + 1
    if theme_miss:
        worst = max(theme_miss, key=theme_miss.get)
        if theme_miss[worst] >= 3:
            tips.append({
                "category": "thème",
                "message": f"Tu fais beaucoup d'erreurs sur le thème « {worst} ». Cible des puzzles similaires.",
                "priority": 1,
            })

    # Progression cours
    stalled = UserProgress.objects.filter(user=user, progress_percent__lt=100, progress_percent__gt=0)
    if stalled.count() >= 2:
        tips.append({
            "category": "cours",
            "message": "Tu as des cours en cours : termine une leçon par jour pour progresser régulièrement.",
            "priority": 2,
        })

    if not tips:
        tips.append({
            "category": "général",
            "message": "Continue à jouer, résoudre des puzzles et suivre les cours AFRICHESS !",
            "priority": 3,
        })

    tips.sort(key=lambda t: t["priority"])
    return tips[:5]
