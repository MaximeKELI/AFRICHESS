"""Calculs d'accuracy type Game Review."""

from __future__ import annotations

import math

ACCURACY_WEIGHTS: dict[str, int] = {
    "brilliant": 100,
    "great": 100,
    "best": 100,
    "book": 100,
    "good": 90,
    "inaccuracy": 75,
    "mistake": 50,
    "blunder": 0,
}

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


# Ancrages précision (%) → ELO estimé de la partie (style « performance rating »
# Chess.com). L'ELO estimé mesure le niveau DE CETTE partie : il peut être bien
# au-dessus ou au-dessous du classement habituel du joueur.
_ELO_ACCURACY_ANCHORS: tuple[tuple[float, int], ...] = (
    (0.0, 100),
    (20.0, 250),
    (40.0, 500),
    (50.0, 700),
    (60.0, 950),
    (70.0, 1200),
    (75.0, 1400),
    (80.0, 1650),
    (85.0, 1950),
    (90.0, 2250),
    (95.0, 2600),
    (98.0, 2850),
    (100.0, 3000),
)

# En dessous de ce nombre de coups joués par un camp, l'estimation n'est pas
# fiable (trop peu d'échantillons) : on renvoie None.
MIN_MOVES_FOR_ELO_ESTIMATE = 6


def estimate_elo_from_accuracy(
    accuracy: float | None,
    move_count: int | None = None,
) -> int | None:
    """Estime l'ELO « de la partie » à partir de la précision d'un camp.

    Interpolation linéaire entre des ancrages calibrés. Renvoie None si la
    précision est absente ou si l'échantillon de coups est trop faible.
    """
    if accuracy is None:
        return None
    if move_count is not None and move_count < MIN_MOVES_FOR_ELO_ESTIMATE:
        return None
    acc = max(0.0, min(100.0, float(accuracy)))
    anchors = _ELO_ACCURACY_ANCHORS
    if acc <= anchors[0][0]:
        elo = anchors[0][1]
    elif acc >= anchors[-1][0]:
        elo = anchors[-1][1]
    else:
        elo = anchors[-1][1]
        for (a0, e0), (a1, e1) in zip(anchors, anchors[1:]):
            if a0 <= acc <= a1:
                ratio = (acc - a0) / (a1 - a0) if a1 > a0 else 0.0
                elo = e0 + ratio * (e1 - e0)
                break
    # Arrondi à la dizaine, comme un rating affiché.
    return int(round(elo / 10.0) * 10)


def compute_estimated_elos(
    move_accuracy_white: float | None,
    move_accuracy_black: float | None,
    move_rows: list[tuple[str, bool]],
) -> tuple[int | None, int | None]:
    """ELO estimé de la partie pour chaque camp (à partir de la précision)."""
    white_moves = sum(1 for _, is_white in move_rows if is_white)
    black_moves = sum(1 for _, is_white in move_rows if not is_white)
    est_w = estimate_elo_from_accuracy(move_accuracy_white, white_moves)
    est_b = estimate_elo_from_accuracy(move_accuracy_black, black_moves)
    return est_w, est_b
