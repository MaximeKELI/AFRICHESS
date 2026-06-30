"""Accès contenu learning premium (leçons avancées, vidéos)."""

from __future__ import annotations

FREE_LESSONS_PER_COURSE = 2


def user_has_learning_premium(user) -> bool:
    return bool(user and user.is_authenticated and user.is_premium)


def lesson_requires_premium(lesson) -> bool:
    return lesson.order > FREE_LESSONS_PER_COURSE


def can_access_lesson(user, lesson) -> bool:
    if not lesson_requires_premium(lesson):
        return True
    return user_has_learning_premium(user)


def can_access_premium_video(user, video) -> bool:
    if not video.is_premium:
        return True
    return user_has_learning_premium(user)
