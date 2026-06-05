"""Échantillonnage aléatoire sans ORDER BY ? (coûteux sur grosses tables)."""

import random

from django.db.models import QuerySet


def random_queryset(qs: QuerySet, count: int, *, pk_cap: int = 5000):
    count = max(1, min(int(count), 50))
    pks = list(qs.values_list("pk", flat=True)[:pk_cap])
    if not pks:
        return qs.none()
    if len(pks) <= count:
        return qs.filter(pk__in=pks)
    chosen = random.sample(pks, count)
    return qs.filter(pk__in=chosen)
