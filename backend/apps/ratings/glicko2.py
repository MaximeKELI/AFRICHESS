"""Glicko-2 rating system (Glickman & Jones, 2010) — réimplémentation indépendante."""

from __future__ import annotations

import math
from dataclasses import dataclass

GLICKO2_SCALE = 173.7178
Q = math.log(10) / 400
TAU_DEFAULT = 0.5
EPSILON = 0.000001


@dataclass
class Glicko2State:
    rating: float
    rd: float
    volatility: float


def _to_internal(rating: float, rd: float, vol: float) -> tuple[float, float, float]:
    mu = (rating - 1500.0) / GLICKO2_SCALE
    phi = rd / GLICKO2_SCALE
    return mu, phi, vol


def _from_internal(mu: float, phi: float, vol: float) -> Glicko2State:
    return Glicko2State(
        rating=mu * GLICKO2_SCALE + 1500.0,
        rd=phi * GLICKO2_SCALE,
        volatility=vol,
    )


def _g(phi: float) -> float:
    return 1.0 / math.sqrt(1.0 + 3.0 * phi * phi / (math.pi * math.pi))


def _expected_score(mu: float, mu_j: float, phi_j: float) -> float:
    return 1.0 / (1.0 + math.exp(-_g(phi_j) * (mu - mu_j)))


def _f(x: float, delta: float, phi: float, v: float, a: float, tau: float) -> float:
    ex = math.exp(x)
    num = ex * (delta * delta - phi * phi - v - ex)
    den = 2.0 * (phi * phi + v + ex) * (phi * phi + v + ex)
    return num / den - (x - a) / (tau * tau)


def rate_period(
    state: Glicko2State,
    opponents: list[Glicko2State],
    scores: list[float],
    tau: float = TAU_DEFAULT,
) -> Glicko2State:
    """Met à jour après une période (1+ parties). scores: 0, 0.5 ou 1."""
    if not opponents:
        mu, phi, vol = _to_internal(state.rating, state.rd, state.volatility)
        phi_star = math.sqrt(phi * phi + vol * vol)
        return _from_internal(mu, phi_star, vol)

    mu, phi, vol = _to_internal(state.rating, state.rd, state.volatility)
    a = math.log(vol * vol)

    v_inv = 0.0
    delta_sum = 0.0
    for opp, score in zip(opponents, scores):
        mu_j, phi_j, _ = _to_internal(opp.rating, opp.rd, opp.volatility)
        g_j = _g(phi_j)
        e_j = _expected_score(mu, mu_j, phi_j)
        v_inv += g_j * g_j * e_j * (1.0 - e_j)
        delta_sum += g_j * (score - e_j)

    v = 1.0 / v_inv
    delta = v * delta_sum

    A = a
    if delta * delta > phi * phi + v:
        B = math.log(delta * delta - phi * phi - v)
    else:
        k = 1
        while _f(a - k * tau, delta, phi, v, a, tau) < 0:
            k += 1
        B = a - k * tau

    fA = _f(A, delta, phi, v, a, tau)
    fB = _f(B, delta, phi, v, a, tau)
    while abs(B - A) > EPSILON:
        C = A + (A - B) * fA / (fB - fA)
        fC = _f(C, delta, phi, v, a, tau)
        if fC * fB < 0:
            A, fA = B, fB
        else:
            fA /= 2.0
        B, fB = C, fC

    new_vol = math.exp(A / 2.0)
    phi_star = math.sqrt(phi * phi + new_vol * new_vol)
    phi_new = 1.0 / math.sqrt(1.0 / (phi_star * phi_star) + 1.0 / v)
    mu_new = mu + phi_new * phi_new * delta_sum / v

    return _from_internal(mu_new, phi_new, new_vol)


def display_rating(state: Glicko2State) -> int:
    return max(100, round(state.rating))


def provisional_rd(games_count: int) -> float:
    """RD élevé tant que peu de parties (style Lichess)."""
    if games_count < 5:
        return 350.0
    if games_count < 10:
        return 250.0
    if games_count < 20:
        return 150.0
    return max(45.0, 350.0 / math.sqrt(games_count))
