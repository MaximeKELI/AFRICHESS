"""Échantillonnage aléatoire sans ORDER BY ? (coûteux sur grosses tables)."""

import random

from django.db.models import Max, Min, QuerySet


def random_queryset(qs: QuerySet, count: int, *, pk_cap: int | None = None):
    """Retourne un sous-ensemble aléatoire (jusqu'à pk_cap IDs chargés)."""
    count = max(1, min(int(count), 50))
    cap = pk_cap or 15_000

    agg = qs.aggregate(mn=Min("pk"), mx=Max("pk"))
    mn, mx = agg.get("mn"), agg.get("mx")
    if mn is None or mx is None:
        return qs.none()

    span = mx - mn + 1
    if span <= cap:
        pks = list(qs.values_list("pk", flat=True))
    else:
        # Probe aléatoire dans la plage de PK (rapide sur 10k+ lignes)
        attempts = min(cap * 3, span)
        candidates = {random.randint(mn, mx) for _ in range(attempts)}
        pks = list(qs.filter(pk__in=candidates).values_list("pk", flat=True)[:cap])

    if not pks:
        pks = list(qs.values_list("pk", flat=True)[:cap])
    if not pks:
        return qs.none()
    if len(pks) <= count:
        return qs.filter(pk__in=pks)
    chosen = random.sample(pks, count)
    return qs.filter(pk__in=chosen)
