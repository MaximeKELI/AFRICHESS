"""Commentaires en français pour les coups (IA taquine + coaching joueur)."""
from __future__ import annotations

import random
from typing import Optional

import chess

OPENING_AI = [
    "J'ouvre le jeu — le centre est important.",
    "Premier coup : développons nos pièces.",
    "Commençons calmement… ou pas.",
    "Tu crois me surprendre ? On verra.",
]

OPENING_PLAYER = [
    "Bon départ. Voyons comment la partie évolue.",
    "Ouverture classique — restez attentif au centre.",
    "Solide — gardez la pression sur le centre.",
]

CAPTURE_AI = [
    "Je prends cette pièce — merci pour le cadeau !",
    "Capture ! Ta pièce m'appartient maintenant.",
    "Échange favorable pour moi — adieu !",
    "Une pièce de moins pour toi, une de plus pour moi.",
]

CAPTURE_PLAYER = [
    "Belle capture ! Vérifiez que vous ne laissez rien en prise.",
    "Vous remportez du matériel — bien joué.",
    "Bon échange — l'ordinateur grince des dents.",
]

CHECK_AI = [
    "Échec ! Tu trembles déjà ?",
    "Je mets la pression — ton roi transpire.",
    "Échec. Trouve la parade… si tu peux.",
    "Échec ! Ça se complique pour toi.",
]

CHECK_PLAYER = [
    "Vous donnez échec — l'adversaire doit se défendre.",
    "Échec ! Bonne initiative, continuez !",
    "Échec ! L'IA est en difficulté.",
]

MATE_AI = [
    "Échec et mat ! Mater sauvagement, comme promis.",
    "Mat ! La partie est terminée — merci pour le spectacle.",
    "Mat ! Tu t'en es bien sorti… non, en fait non.",
    "Checkmate ! À la prochaine — si tu oses.",
]

MATE_PLAYER = [
    "Félicitations — échec et mat ! Vous l'avez humilié.",
    "Vous avez maté l'ordinateur, bravo !",
    "Mat ! L'IA ne s'en remettra pas de sitôt.",
]

# IA domine — proche du mat adverse
TAUNT_AI_NEAR_MATE = [
    "Maintenant je vais te mater sauvagement !",
    "C'est fini pour toi — prépare-toi au mat !",
    "Ton roi n'a nulle part où fuir. Le mat arrive.",
    "J'ai l'odeur du mat… tu sens la panique ?",
    "Encore quelques coups et c'est mat — résigne-toi ou souffre !",
    "Tu voulais du spectacle ? Voici ton mat en direct.",
]

# IA en danger — le joueur menace le mat
TAUNT_AI_UNDER_MATE_THREAT = [
    "Ouch… tu es dangereusement proche de me mater sauvagement.",
    "Ok ok, tu me pousses au bord — pas si vite !",
    "Je sens le mat venir… tu es redoutable !",
    "Mon roi transpire — tu es proche du mat, j'en ai peur.",
    "Tu me mater sauvagement ? Pas si facile, humain !",
    "Alerte rouge : tu es à deux doigts du mat. Je me bats !",
]

# Joueur domine (coach / encouragement taquin)
PLAYER_NEAR_MATE = [
    "Vous êtes proche de le mater sauvagement — finissez le travail !",
    "L'ordinateur est en sursis : un coup de grâce !",
    "Position écrasante — cherchez le mat !",
    "Il ne lui reste presque rien — soyez implacable.",
    "Vous avez le mat au bout des doigts, concentrez-vous.",
]

CASTLE_AI = [
    "Je roque — mon roi se cache, le tien ne le pourra pas.",
    "Roque effectué — essaie de m'atteindre maintenant.",
]

CASTLE_PLAYER = [
    "Bon roque — sécurisez toujours votre roi à temps.",
    "Roque solide — votre roi respire.",
]

PROMOTION_AI = [
    "Promotion ! Une dame de plus — tu vas adorer.",
    "Pion promu — la position devient un cauchemar pour toi.",
]

PROMOTION_PLAYER = [
    "Promotion réussie — cette dame peut décider la partie.",
    "Dame ! L'IA va souffrir.",
]

STRONG_AI = [
    "Ce coup consolide mon avantage — tu m'en veux ?",
    "Je renforce ma position. Tu suis ?",
    "Position solide… pour moi. Pas pour toi.",
    "Pas mal, moi. Très mal, toi.",
]

STRONG_PLAYER = [
    "Excellent coup — vous gardez l'initiative.",
    "Très bon — la position vous sourit.",
    "L'IA n'aime pas ce coup du tout.",
]

WEAK_PLAYER = [
    "Ce coup affaiblit un peu votre position…",
    "Attention, vous laissez des faiblesses.",
    "Hmm, l'adversaire peut en profiter — reprenez-vous !",
]

TAUNT_AI_AFTER_BLUNDER = [
    "Merci pour le cadeau — je ne m'y attendais pas !",
    "Erreur ? Je ne refuse jamais un bonbon.",
    "Sympa de m'offrir la partie comme ça.",
]

NEUTRAL_AI = [
    "Je continue mon plan — tu suis ou tu rames ?",
    "Coup joué. À toi… si tu oses.",
    "Développement en cours. Ne t'endors pas.",
    "On avance. Tu tiens le choc, champion ?",
]

TAUNT_AI_GENERAL = [
    "Tu crois me tenir ? Drôle.",
    "Continue comme ça, tu me fais rire.",
    "Pas mal… pour un débutant.",
    "Tu joues vite — tu réfléchis parfois ?",
    "J'adore quand tu te débats inutilement.",
    "Calme-toi, la partie est loin d'être finie — pour toi.",
    "Tu voulais du niveau ? Le voilà.",
]

NEUTRAL_PLAYER = [
    "Coup solide.",
    "La partie reste équilibrée.",
    "Rien de catastrophique — continuez.",
]


def _is_castling(san: str) -> bool:
    return "O-O" in san


def _is_promotion(san: str) -> bool:
    return "=" in san


def _eval_gain_for_mover(
    eval_before: float,
    eval_after: float,
    mover_is_white: bool,
) -> float:
    """Gain d'évaluation (pions) pour le camp qui vient de jouer."""
    delta = eval_after - eval_before
    return delta if mover_is_white else -delta


def _eval_for_mover(eval_cp: float, mover_is_white: bool) -> float:
    """Évaluation (pions) du point de vue du camp qui vient de jouer."""
    return eval_cp if mover_is_white else -eval_cp


_PIECE_VALUES = {
    chess.PAWN: 1.0,
    chess.KNIGHT: 3.0,
    chess.BISHOP: 3.2,
    chess.ROOK: 5.0,
    chess.QUEEN: 9.0,
}


def _material_eval(board: chess.Board) -> float:
    """Estimation matérielle (pions) du point de vue des Blancs."""
    white = 0.0
    black = 0.0
    for square, piece in board.piece_map().items():
        val = _PIECE_VALUES.get(piece.piece_type, 0.0)
        if piece.color == chess.WHITE:
            white += val
        else:
            black += val
    return white - black


def _opponent_under_serious_attack(board: chess.Board) -> bool:
    """Le camp dont c'est le tour subit une forte pression (après le coup adverse)."""
    if board.is_check():
        return True
    side = board.turn
    king = board.king(side)
    if king is None:
        return False
    attackers = board.attackers(not side, king)
    if len(attackers) >= 2:
        return True
    legal = board.legal_moves.count()
    return len(attackers) >= 1 and legal <= 6


def generate_move_comment(
    fen_before: str,
    uci: str,
    san: str,
    *,
    played_by_ai: bool,
    mover_is_white: bool,
    move_number: int,
    eval_before: Optional[float] = None,
    eval_after: Optional[float] = None,
    best_san: Optional[str] = None,
) -> str:
    """Génère un commentaire court en français pour un coup."""
    board = chess.Board(fen_before)
    try:
        move = chess.Move.from_uci(uci)
    except ValueError:
        return random.choice(NEUTRAL_AI if played_by_ai else NEUTRAL_PLAYER)

    was_in_check = board.is_check()
    is_capture = board.is_capture(move)
    board.push(move)
    is_mate = board.is_checkmate()
    is_check = board.is_check() and not is_mate
    opponent_pressured = _opponent_under_serious_attack(board)
    board.pop()

    pick = random.choice
    if eval_after is None:
        eval_after = _material_eval(board)
    if eval_before is None:
        eval_before = _material_eval(chess.Board(fen_before))

    eval_mover = _eval_for_mover(eval_after, mover_is_white)
    eval_gain = _eval_gain_for_mover(eval_before, eval_after, mover_is_white)

    if is_mate:
        return pick(MATE_AI if played_by_ai else MATE_PLAYER)

    if played_by_ai and was_in_check and not is_mate:
        return pick(TAUNT_AI_UNDER_MATE_THREAT)

    # --- Taquineries selon menace de mat / avantage écrasant ---
    if played_by_ai:
        if eval_mover >= 2.5 and (opponent_pressured or is_check or eval_mover >= 4.0):
            return pick(TAUNT_AI_NEAR_MATE)
        if eval_mover <= -2.5 and opponent_pressured:
            return pick(TAUNT_AI_UNDER_MATE_THREAT)
        if eval_gain >= 1.5 and eval_mover >= 1.0 and random.random() < 0.55:
            return pick(TAUNT_AI_AFTER_BLUNDER)
    else:
        if eval_mover >= 2.5 and (is_check or opponent_pressured or eval_mover >= 4.0):
            return pick(PLAYER_NEAR_MATE)

    if is_check:
        return pick(CHECK_AI if played_by_ai else CHECK_PLAYER)

    if _is_castling(san):
        return pick(CASTLE_AI if played_by_ai else CASTLE_PLAYER)

    if _is_promotion(san):
        return pick(PROMOTION_AI if played_by_ai else PROMOTION_PLAYER)

    if is_capture:
        return pick(CAPTURE_AI if played_by_ai else CAPTURE_PLAYER)

    if move_number <= 2:
        return pick(OPENING_AI if played_by_ai else OPENING_PLAYER)

    gain = eval_gain
    if not played_by_ai:
        if gain >= 0.8:
            return pick(STRONG_PLAYER)
        if gain <= -1.2:
            hint = f" Mieux valait {best_san}." if best_san else ""
            return (
                f"{pick(WEAK_PLAYER)} La position s'est dégradée d'environ "
                f"{abs(gain):.1f} pions.{hint}"
            )
    else:
        if gain >= 0.8:
            if gain >= 1.5 and random.random() < 0.5:
                return pick(TAUNT_AI_AFTER_BLUNDER)
            return pick(STRONG_AI)
        if gain <= -1.2:
            if eval_mover <= -2.0:
                return pick(TAUNT_AI_UNDER_MATE_THREAT)
            return "Je subis une petite pression, mais je tiens… pour l'instant."

    if played_by_ai and random.random() < 0.4:
        return pick(TAUNT_AI_GENERAL)

    return pick(NEUTRAL_AI if played_by_ai else NEUTRAL_PLAYER)
