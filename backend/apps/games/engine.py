"""Stockfish integration for AI moves and game analysis."""
import logging
import random
from dataclasses import dataclass
from typing import Optional

import chess
import chess.engine
from django.conf import settings

from .elo_config import STOCKFISH_UCI_MAX_ELO, clamp_elo
from .variant_utils import apply_move as variant_apply_move
from .variant_utils import board_from_fen, pick_variant_move

logger = logging.getLogger(__name__)


@dataclass
class EngineMove:
    uci: str
    san: str
    evaluation: Optional[float] = None
    is_mate: bool = False


@dataclass
class MoveEvaluation:
    uci: str
    san: str
    eval_before: float
    eval_after: float
    centipawn_loss: int
    classification: str  # best, good, inaccuracy, mistake, blunder


class ChessEngineService:
    """Wrapper around Stockfish — joue à un ELO UCI quand possible."""

    # Repli profondeur si UCI indisponible (curseur 1–20)
    DIFFICULTY_DEPTH = {
        1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10, 7: 11, 8: 12, 9: 13, 10: 14,
        11: 15, 12: 16, 13: 17, 14: 18, 15: 19, 16: 20, 17: 21, 18: 22, 19: 24, 20: 26,
    }

    def __init__(self, stockfish_path: Optional[str] = None):
        self.path = stockfish_path or settings.STOCKFISH_PATH

    def _get_engine(self):
        return chess.engine.SimpleEngine.popen_uci(self.path)

    def _skill_level_for_elo(self, elo: int) -> int:
        """Skill Level 0–20 : plus bas = plus faible (débutants)."""
        if elo <= 500:
            return 0
        if elo <= 900:
            return 1
        if elo <= 1100:
            return 2
        if elo <= 1400:
            return 5
        if elo <= 1800:
            return 8
        if elo <= 2200:
            return 12
        return 20

    def _configure_strength(self, engine, target_elo: int) -> str:
        """
        Configure la force du moteur.
        Retourne 'uci_elo', 'skill' ou 'depth' selon les options supportées.
        """
        elo = min(clamp_elo(target_elo), STOCKFISH_UCI_MAX_ELO)
        skill = self._skill_level_for_elo(elo)
        slow = {"Slow Mover": 150} if elo <= 1100 else {}
        try:
            engine.configure(
                {
                    "UCI_LimitStrength": True,
                    "UCI_Elo": elo,
                    "Skill Level": skill,
                    **slow,
                }
            )
            return "uci_elo"
        except chess.engine.EngineError:
            logger.debug("UCI_Elo indisponible, essai Skill Level seul")
        try:
            engine.configure(
                {
                    "UCI_LimitStrength": False,
                    "Skill Level": skill,
                    **slow,
                }
            )
            return "skill"
        except chess.engine.EngineError:
            logger.warning("Skill Level non supporté, repli profondeur/ELO")
            return "depth"

    def _limit_for_weak_elo(self, elo: int) -> chess.engine.Limit:
        """Profondeur/temps calibrés pour simuler un ELO faible sans UCI_Elo."""
        if elo <= 400:
            return chess.engine.Limit(depth=2, time=0.03)
        if elo <= 700:
            return chess.engine.Limit(depth=3, time=0.05)
        if elo <= 1000:
            return chess.engine.Limit(depth=4, time=0.08)
        if elo <= 1400:
            return chess.engine.Limit(depth=6, time=0.12)
        if elo <= 1800:
            return chess.engine.Limit(depth=8, time=0.2)
        if elo <= 2200:
            return chess.engine.Limit(depth=10, time=0.3)
        return chess.engine.Limit(depth=12, time=0.4)

    def _limit_for_elo(self, target_elo: int, difficulty: int) -> chess.engine.Limit:
        """Au-delà de l'ELO UCI : force maximale (profondeur + temps)."""
        elo = clamp_elo(target_elo) if target_elo else 1200
        if elo > STOCKFISH_UCI_MAX_ELO:
            if elo >= 4800:
                return chess.engine.Limit(depth=32, time=3.0)
            if elo >= 4200:
                return chess.engine.Limit(depth=30, time=2.2)
            if elo >= 3600:
                return chess.engine.Limit(depth=28, time=1.5)
            return chess.engine.Limit(depth=26, time=1.0)

        depth = self.DIFFICULTY_DEPTH.get(min(max(difficulty, 1), 20), 14)
        return chess.engine.Limit(depth=depth)

    def _maybe_random_weak_move(self, board: chess.Board, elo: int) -> Optional[EngineMove]:
        """Coup aléatoire légal pour débutants (0–500 / 500–1000 ELO)."""
        if elo > 1000:
            return None
        chance = 0.45 if elo <= 500 else 0.28
        if random.random() > chance:
            return None
        legal = list(board.legal_moves)
        if not legal:
            return None
        move = random.choice(legal)
        return EngineMove(uci=move.uci(), san=board.san(move))

    def get_best_move(
        self,
        fen: str,
        difficulty: int = 10,
        target_elo: Optional[int] = None,
        variant: str = "standard",
    ) -> Optional[EngineMove]:
        if variant in ("chess960", "crazyhouse"):
            elo = clamp_elo(target_elo) if target_elo else 1200
            uci = pick_variant_move(fen, variant, elo)
            if not uci:
                return None
            board = board_from_fen(fen, variant)
            move = chess.Move.from_uci(uci)
            return EngineMove(uci=uci, san=board.san(move))

        board = chess.Board(fen)
        elo = clamp_elo(target_elo) if target_elo else None
        diff_key = min(max(difficulty, 1), 20)

        if elo is not None:
            weak = self._maybe_random_weak_move(board, elo)
            if weak:
                return weak

        try:
            with self._get_engine() as engine:
                strength_mode = (
                    self._configure_strength(engine, elo)
                    if elo is not None and elo <= STOCKFISH_UCI_MAX_ELO
                    else "depth"
                )
                if strength_mode == "uci_elo":
                    limit = self._limit_for_weak_elo(elo)
                elif strength_mode == "skill":
                    limit = self._limit_for_weak_elo(elo)
                elif elo is not None:
                    limit = self._limit_for_weak_elo(elo)
                else:
                    limit = self._limit_for_elo(1200, diff_key)

                result = engine.play(board, limit)
                if result.move:
                    san = board.san(result.move)
                    return EngineMove(uci=result.move.uci(), san=san)
        except Exception as e:
            logger.error("Engine error: %s", e)
        return None

    def analyze_position(self, fen: str, depth: Optional[int] = None) -> Optional[float]:
        board = chess.Board(fen)
        depth = depth or settings.ENGINE_DEPTH
        try:
            with self._get_engine() as engine:
                info = engine.analyse(board, chess.engine.Limit(depth=depth))
                score = info["score"].white()
                if score.is_mate():
                    return 10000 if score.mate() > 0 else -10000
                return score.score() / 100.0
        except Exception as e:
            logger.error("Analysis error: %s", e)
        return None

    @staticmethod
    def _moves_from_pgn(pgn: str) -> list[tuple[str, bool]]:
        game = chess.pgn.read_game(io.StringIO(pgn))
        if not game:
            return []
        board = chess.Board()
        out: list[tuple[str, bool]] = []
        node = game
        while node.variations:
            node = node.variation(0)
            move = node.move
            if not move:
                break
            out.append((move.uci(), board.turn == chess.WHITE))
            board.push(move)
        return out

    def analyze_game(self, pgn: str) -> list[MoveEvaluation]:
        """Analyse à partir d'un PGN (module apprentissage)."""
        return self.analyze_game_moves(self._moves_from_pgn(pgn))

    def analyze_game_moves(
        self, moves: list[tuple[str, bool]]
    ) -> list[MoveEvaluation]:
        """Analyse une partie à partir des coups UCI (uci, played_by_white)."""
        board = chess.Board()
        evaluations: list[MoveEvaluation] = []
        try:
            with self._get_engine() as engine:
                for uci, played_by_white in moves:
                    try:
                        move = chess.Move.from_uci(uci)
                    except ValueError:
                        logger.warning("Invalid UCI in analysis: %s", uci)
                        break
                    if move not in board.legal_moves:
                        logger.warning("Illegal move in analysis: %s", uci)
                        break
                    info_before = engine.analyse(
                        board, chess.engine.Limit(depth=10)
                    )
                    eval_before = self._score_to_cp(info_before["score"].white())
                    san = board.san(move)
                    board.push(move)
                    info_after = engine.analyse(
                        board, chess.engine.Limit(depth=10)
                    )
                    eval_after = self._score_to_cp(info_after["score"].white())
                    if played_by_white:
                        cp_loss = max(0, eval_before - eval_after)
                    else:
                        cp_loss = max(0, eval_after - eval_before)
                    evaluations.append(
                        MoveEvaluation(
                            uci=move.uci(),
                            san=san,
                            eval_before=eval_before / 100,
                            eval_after=eval_after / 100,
                            centipawn_loss=cp_loss,
                            classification=self._classify_move(cp_loss),
                        )
                    )
        except Exception as e:
            logger.error("Game analysis error: %s", e)
        return evaluations

    @staticmethod
    def _score_to_cp(score) -> int:
        if score.is_mate():
            return 10000 if score.mate() > 0 else -10000
        return score.score() or 0

    @staticmethod
    def _classify_move(cp_loss: int) -> str:
        if cp_loss <= 10:
            return "best"
        if cp_loss <= 25:
            return "good"
        if cp_loss <= 50:
            return "inaccuracy"
        if cp_loss <= 100:
            return "mistake"
        return "blunder"

    def is_legal_move(self, fen: str, uci: str) -> bool:
        board = chess.Board(fen)
        try:
            move = chess.Move.from_uci(uci)
            return move in board.legal_moves
        except ValueError:
            return False

    def apply_move(self, fen: str, uci: str) -> Optional[tuple[str, str, bool]]:
        """Returns (new_fen, san, is_game_over) or None if illegal."""
        board = chess.Board(fen)
        try:
            move = chess.Move.from_uci(uci)
            if move not in board.legal_moves:
                return None
            san = board.san(move)
            board.push(move)
            return board.fen(), san, board.is_game_over()
        except ValueError:
            return None
