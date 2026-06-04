"""Commentaires en français pour les coups (IA et coaching joueur)."""
from __future__ import annotations

import random
from typing import Optional

import chess

OPENING_AI = [
    "J'ouvre le jeu — le centre est important.",
    "Premier coup : développons nos pièces.",
    "Commençons calmement, sans précipitation.",
]

OPENING_PLAYER = [
    "Bon départ. Voyons comment la partie évolue.",
    "Ouverture classique — restez attentif au centre.",
]

CAPTURE_AI = [
    "Je prends cette pièce — le matériel compte.",
    "Capture ! Votre pièce est tombée.",
    "Échange favorable pour moi, je récupère la pièce.",
]

CAPTURE_PLAYER = [
    "Belle capture ! Vérifiez que vous ne laissez rien en prise.",
    "Vous remportez du matériel — bien joué.",
]

CHECK_AI = [
    "Échec ! Votre roi est en danger.",
    "Je mets la pression — défendez votre roi.",
    "Échec. Trouvez la parade obligatoire.",
]

CHECK_PLAYER = [
    "Vous donnez échec — l'adversaire doit se défendre.",
    "Échec ! Bonne initiative.",
]

MATE_AI = [
    "Échec et mat ! La partie est terminée.",
    "Mat ! Merci pour cette partie.",
]

MATE_PLAYER = [
    "Félicitations — échec et mat !",
    "Vous avez maté l'ordinateur, bravo !",
]

CASTLE_AI = [
    "Je roque pour mettre mon roi en sécurité.",
    "Roque effectué — le roi est plus sûr.",
]

CASTLE_PLAYER = [
    "Bon roque — sécurisez toujours votre roi à temps.",
]

PROMOTION_AI = [
    "Promotion ! Une nouvelle dame entre en jeu.",
    "Pion promu — la position devient critique.",
]

PROMOTION_PLAYER = [
    "Promotion réussie — cette dame peut décider la partie.",
]

STRONG_AI = [
    "Ce coup consolide mon avantage.",
    "Je renforce ma position ici.",
    "Position solide de mon côté.",
]

STRONG_PLAYER = [
    "Excellent coup — vous gardez l'initiative.",
    "Très bon — la position vous sourit.",
]

WEAK_PLAYER = [
    "Ce coup affaiblit un peu votre position…",
    "Attention, vous laissez des faiblesses.",
    "Hmm, l'adversaire peut profiter de ce coup.",
]

NEUTRAL_AI = [
    "Je continue mon plan.",
    "Coup joué — à vous de répondre.",
    "Développement en cours.",
]

NEUTRAL_PLAYER = [
    "Coup solide.",
    "La partie reste équilibrée.",
]


def _is_castling(san: str) -> bool:
    return "O-O" in san


def _is_promotion(san: str) -> bool:
    return "=" in san


def generate_move_comment(
    fen_before: str,
    uci: str,
    san: str,
    *,
    played_by_ai: bool,
    move_number: int,
    eval_before: Optional[float] = None,
    eval_after: Optional[float] = None,
) -> str:
    """Génère un commentaire court en français pour un coup."""
    board = chess.Board(fen_before)
    try:
        move = chess.Move.from_uci(uci)
    except ValueError:
        return random.choice(NEUTRAL_AI if played_by_ai else NEUTRAL_PLAYER)

    is_capture = board.is_capture(move)
    board.push(move)
    is_mate = board.is_checkmate()
    is_check = board.is_check() and not is_mate
    board.pop()

    pool_ai = played_by_ai
    pick = random.choice

    if is_mate:
        return pick(MATE_AI if pool_ai else MATE_PLAYER)

    if is_check:
        return pick(CHECK_AI if pool_ai else CHECK_PLAYER)

    if _is_castling(san):
        return pick(CASTLE_AI if pool_ai else CASTLE_PLAYER)

    if _is_promotion(san):
        return pick(PROMOTION_AI if pool_ai else PROMOTION_PLAYER)

    if is_capture:
        return pick(CAPTURE_AI if pool_ai else CAPTURE_PLAYER)

    if move_number <= 2:
        return pick(OPENING_AI if pool_ai else OPENING_PLAYER)

    if eval_before is not None and eval_after is not None:
        # Éval du point de vue des blancs ; ajuster si l'IA joue les noirs
        delta = eval_after - eval_before
        if not played_by_ai:
            # Coup du joueur humain (blancs ou noirs selon partie)
            if delta >= 0.8:
                return pick(STRONG_PLAYER)
            if delta <= -1.2:
                return pick(WEAK_PLAYER)

        if played_by_ai and delta <= -0.8:
            return pick(STRONG_AI)
        if played_by_ai and delta >= 1.0:
            return "Je subis une petite pression, mais je tiens."

    return pick(NEUTRAL_AI if pool_ai else NEUTRAL_PLAYER)
