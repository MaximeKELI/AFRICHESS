"""Spaced repetition SM-2 simplifié pour lignes d'étude."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .models import LineReview, StudyLine


def get_due_lines(user, limit: int = 10) -> list[StudyLine]:
    now = timezone.now()
    reviews = (
        LineReview.objects.filter(user=user, next_review__lte=now)
        .select_related("line")
        .order_by("next_review")[:limit]
    )
    return [r.line for r in reviews]


def schedule_review(user, line: StudyLine, quality: int) -> LineReview:
    """
    quality 0–5 (0=échec total, 5=parfait).
    """
    review, _ = LineReview.objects.get_or_create(
        user=user,
        line=line,
        defaults={"next_review": timezone.now()},
    )
    if quality < 3:
        review.repetitions = 0
        review.interval_days = 1
    else:
        if review.repetitions == 0:
            review.interval_days = 1
        elif review.repetitions == 1:
            review.interval_days = 3
        else:
            review.interval_days = max(1, int(review.interval_days * review.ease_factor))
        review.repetitions += 1
        review.ease_factor = max(1.3, review.ease_factor + 0.1 - (5 - quality) * 0.08)

    review.last_review = timezone.now()
    review.next_review = timezone.now() + timedelta(days=review.interval_days)
    review.save()
    return review
