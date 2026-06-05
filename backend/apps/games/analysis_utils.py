"""Calculs d'accuracy type Game Review."""

from __future__ import annotations

ACCURACY_WEIGHTS: dict[str, int] = {
    "best": 100,
    "good": 90,
    "inaccuracy": 75,
    "mistake": 50,
    "blunder": 0,
}

MAX_ANALYZED_MOVES = 80


def compute_accuracies(
    evaluations: list,
    move_rows: list[tuple[str, bool]],
) -> tuple[float | None, float | None]:
    white_scores: list[int] = []
    black_scores: list[int] = []
    for i, ev in enumerate(evaluations):
        w = ACCURACY_WEIGHTS.get(ev.classification, 50)
        if move_rows[i][1]:
            white_scores.append(w)
        else:
            black_scores.append(w)
    acc_w = round(sum(white_scores) / len(white_scores), 1) if white_scores else None
    acc_b = round(sum(black_scores) / len(black_scores), 1) if black_scores else None
    return acc_w, acc_b
