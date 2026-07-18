#!/usr/bin/env python3
"""Valide la hiérarchie des bots : un ELO supérieur doit battre un ELO inférieur.

On fait s'affronter des bots de différents ELO cibles (via get_best_move) et on
vérifie que le score suit l'ordre attendu. Couleurs alternées pour l'équité.

Usage ::

    DJANGO_SETTINGS_MODULE=config.settings.development \
        python backend/scripts/measure_bot_ladder.py [games_per_pair] [max_plies]
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

import chess  # noqa: E402

from apps.games.engine import ChessEngineService, close_stockfish_pool  # noqa: E402

PAIRS = [
    (400, 900),
    (900, 1400),
    (1400, 1900),
    (1900, 2400),
    (800, 2000),
]


def play_game(service: ChessEngineService, white_elo: int, black_elo: int, max_plies: int):
    board = chess.Board()
    while not board.is_game_over(claim_draw=True) and board.fullmove_number <= max_plies:
        elo = white_elo if board.turn == chess.WHITE else black_elo
        em = service.get_best_move(board.fen(), target_elo=elo)
        if not em:
            break
        try:
            mv = chess.Move.from_uci(em.uci)
        except ValueError:
            break
        if mv not in board.legal_moves:
            break
        board.push(mv)
    outcome = board.outcome(claim_draw=True)
    if outcome is None or outcome.winner is None:
        return 0.5
    return 1.0 if outcome.winner == chess.WHITE else 0.0


def main(games: int, max_plies: int) -> None:
    service = ChessEngineService()
    print(f"Stockfish: {service.path}  games/pair={games} max_plies={max_plies}\n")
    print(f"{'low':>5} vs {'high':>5} | high score | verdict")
    print("-" * 44)
    for lo, hi in PAIRS:
        hi_points = 0.0
        n = 0
        for i in range(games):
            # Alterne les couleurs pour neutraliser l'avantage du trait.
            if i % 2 == 0:
                res = play_game(service, hi, lo, max_plies)  # high joue Blancs
                hi_points += res
            else:
                res = play_game(service, lo, hi, max_plies)  # high joue Noirs
                hi_points += 1.0 - res
            n += 1
        pct = 100.0 * hi_points / n if n else 0.0
        verdict = "OK" if pct >= 60 else ("faible" if pct >= 50 else "ÉCHEC")
        print(f"{lo:>5} vs {hi:>5} | {hi_points:>4.1f}/{n:<4} {pct:>5.0f}% | {verdict}")
    close_stockfish_pool()


if __name__ == "__main__":
    g = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    p = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    main(g, p)
