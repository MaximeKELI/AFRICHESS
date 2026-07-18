#!/usr/bin/env python3
"""Mesure la force réelle des bots par ELO cible.

Principe : on fait jouer le bot (get_best_move au même ELO des deux côtés),
puis on ré-analyse tous ses coups avec Stockfish à pleine force pour en tirer
la précision moyenne, convertie en « ELO estimé » via les mêmes ancrages que la
Game Review. On compare l'ELO estimé à l'ELO cible.

Usage ::

    DJANGO_SETTINGS_MODULE=config.settings.development \
        python backend/scripts/measure_bot_strength.py [games] [ref_depth] [max_plies]
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

import chess  # noqa: E402

from apps.games.analysis_utils import (  # noqa: E402
    estimate_elo_from_accuracy,
    move_accuracy_from_cp_loss,
)
from apps.games.engine import ChessEngineService, close_stockfish_pool  # noqa: E402

ELOS = [300, 500, 700, 900, 1100, 1300, 1500, 1800, 2100, 2400]


def play_selfplay_game(service: ChessEngineService, elo: int, max_plies: int) -> list[tuple[str, bool]]:
    board = chess.Board()
    moves: list[tuple[str, bool]] = []
    while not board.is_game_over(claim_draw=False) and len(moves) < max_plies:
        em = service.get_best_move(board.fen(), target_elo=elo)
        if not em:
            break
        try:
            mv = chess.Move.from_uci(em.uci)
        except ValueError:
            break
        if mv not in board.legal_moves:
            break
        moves.append((em.uci, board.turn == chess.WHITE))
        board.push(mv)
    return moves


def measure(games: int, ref_depth: int, max_plies: int) -> None:
    service = ChessEngineService()
    print(f"Stockfish: {service.path}")
    print(f"games={games} ref_depth={ref_depth} max_plies={max_plies}\n")
    print(f"{'target':>7} | {'accuracy%':>9} | {'est_elo':>7} | {'delta':>6} | moves")
    print("-" * 52)
    for elo in ELOS:
        accs: list[float] = []
        for _ in range(games):
            moves = play_selfplay_game(service, elo, max_plies)
            if not moves:
                continue
            evals = service.analyze_game_moves(moves, depth=ref_depth)
            accs.extend(move_accuracy_from_cp_loss(e.centipawn_loss) for e in evals)
        if not accs:
            print(f"{elo:>7} | {'n/a':>9} | {'n/a':>7} |")
            continue
        acc = sum(accs) / len(accs)
        est = estimate_elo_from_accuracy(acc, len(accs)) or 0
        delta = est - elo
        print(f"{elo:>7} | {acc:>9.1f} | {est:>7} | {delta:>+6} | {len(accs)}")
    close_stockfish_pool()


if __name__ == "__main__":
    g = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    d = int(sys.argv[2]) if len(sys.argv) > 2 else 16
    p = int(sys.argv[3]) if len(sys.argv) > 3 else 50
    measure(g, d, p)
