"""Normalisation / comparaison UCI pour puzzles (tolère casse et promo dame implicite)."""

from __future__ import annotations


def normalize_uci(uci: str) -> str:
    return str(uci or "").lower().strip()


def uci_equals(a: str, b: str) -> bool:
    na = normalize_uci(a)
    nb = normalize_uci(b)
    if na == nb:
        return True
    if len(na) < 4 or len(nb) < 4:
        return False
    if na[:4] != nb[:4]:
        return False
    promo_a = na[4:] or "q"
    promo_b = nb[4:] or "q"
    return promo_a == promo_b


def normalize_moves(moves: list | None) -> list[str]:
    if not moves:
        return []
    return [normalize_uci(m) for m in moves if normalize_uci(m)]


def moves_match_solution(played: list | None, solution: list | None) -> bool:
    """True si la ligne jouée correspond à la solution (ordre + UCI souple)."""
    p = normalize_moves(played)
    s = normalize_moves(solution)
    if len(p) != len(s):
        return False
    return all(uci_equals(a, b) for a, b in zip(p, s))
