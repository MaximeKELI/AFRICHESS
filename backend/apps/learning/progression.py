"""XP, niveaux et attribution de badges."""

from django.db import transaction

from .models import Badge, LearningProfile, UserBadge, UserProgress

# XP requis pour atteindre chaque niveau (index = niveau)
LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000]


def xp_for_level(level: int) -> int:
    if level < 1:
        return 0
    if level >= len(LEVEL_THRESHOLDS):
        return LEVEL_THRESHOLDS[-1] + (level - len(LEVEL_THRESHOLDS) + 1) * 1000
    return LEVEL_THRESHOLDS[level]


def xp_for_next_level(level: int) -> int:
    return xp_for_level(level + 1)


def level_from_xp(xp: int) -> int:
    level = 1
    for i in range(1, len(LEVEL_THRESHOLDS)):
        if xp >= LEVEL_THRESHOLDS[i]:
            level = i + 1
        else:
            break
    if xp >= LEVEL_THRESHOLDS[-1]:
        extra = (xp - LEVEL_THRESHOLDS[-1]) // 1000
        level = len(LEVEL_THRESHOLDS) + extra
    return max(1, level)


def get_or_create_profile(user) -> LearningProfile:
    profile, _ = LearningProfile.objects.get_or_create(user=user)
    return profile


def add_xp(user, amount: int) -> LearningProfile:
    profile = get_or_create_profile(user)
    profile.xp += amount
    profile.save(update_fields=["xp", "updated_at"])
    _check_level_badges(user, profile)
    return profile


def _check_level_badges(user, profile: LearningProfile):
    for threshold, code in [(500, "xp_500"), (1400, "xp_1400"), (5000, "xp_master")]:
        if profile.xp >= threshold:
            badge = Badge.objects.filter(code=code).first()
            if badge:
                UserBadge.objects.get_or_create(user=user, badge=badge)


def update_course_progress(user, course, lesson_id: int) -> UserProgress:
    total = course.lessons.count()
    progress, _ = UserProgress.objects.get_or_create(user=user, course=course)
    completed = set(progress.completed_lesson_ids or [])
    completed.add(lesson_id)
    progress.completed_lesson_ids = list(completed)
    progress.progress_percent = int((len(completed) / total) * 100) if total else 0
    progress.save()
    return progress


def record_puzzle_result(user, solved: bool):
    profile = get_or_create_profile(user)
    profile.puzzles_attempted += 1
    if solved:
        profile.puzzles_solved_learning += 1
        add_xp(user, 10)
    total = profile.puzzles_attempted
    profile.puzzle_accuracy = round(
        (profile.puzzles_solved_learning / total) * 100, 1
    ) if total else 0.0
    profile.save(
        update_fields=[
            "puzzles_attempted",
            "puzzles_solved_learning",
            "puzzle_accuracy",
            "updated_at",
        ]
    )
    if profile.puzzles_solved_learning >= 10:
        badge = Badge.objects.filter(code="puzzle_10").first()
        if badge:
            UserBadge.objects.get_or_create(user=user, badge=badge)
