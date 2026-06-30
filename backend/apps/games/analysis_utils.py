"""Calculs d'accuracy type Game Review."""

from __future__ import annotations

import math

ACCURACY_WEIGHTS: dict[str, int] = {
    "brilliant": 100,
    "great": 100,
    "best": 100,
    "good": 90,
    "inaccuracy": 75,
    "mistake": 50,
    "blunder": 0,
}

MAX_ANALYZED_MOVES = 80


def move_accuracy_from_cp_loss(cp_loss: float) -> float:
    """Précision d'un coup (formule Chess.com / centipawn loss)."""
    cp = max(0.0, float(cp_loss))
    raw = 103.1668 * math.exp(-0.04354 * (cp**0.9909)) - 3.1669
    return max(0.0, min(100.0, raw))


def compute_accuracies(
    evaluations: list,
    move_rows: list[tuple[str, bool]],
) -> tuple[float | None, float | None]:
    """Précision par classement de coups (ancien système, moyenne des poids)."""
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


def compute_move_accuracies(
    evaluations: list,
    move_rows: list[tuple[str, bool]],
) -> tuple[float | None, float | None]:
    """Précision des coups (CPL moyen, style Chess.com)."""
    white_scores: list[float] = []
    black_scores: list[float] = []
    for i, ev in enumerate(evaluations):
        score = move_accuracy_from_cp_loss(ev.centipawn_loss)
        if move_rows[i][1]:
            white_scores.append(score)
        else:
            black_scores.append(score)
    acc_w = round(sum(white_scores) / len(white_scores), 1) if white_scores else None
    acc_b = round(sum(black_scores) / len(black_scores), 1) if black_scores else None
    return acc_w, acc_b
