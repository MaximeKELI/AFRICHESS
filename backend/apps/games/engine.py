"""Stockfish integration for AI moves and game analysis."""
import logging
from dataclasses import dataclass
from typing import Optional

import chess
import chess.engine
from django.conf import settings

from .elo_config import STOCKFISH_UCI_MAX_ELO, clamp_elo

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

    def _configure_strength(self, engine, target_elo: int) -> bool:
        """Active UCI_LimitStrength + UCI_Elo (Stockfish, max ~3190)."""
        elo = min(clamp_elo(target_elo), STOCKFISH_UCI_MAX_ELO)
        try:
            engine.configure({"UCI_LimitStrength": True, "UCI_Elo": elo})
            return True
        except chess.engine.EngineError:
            logger.warning("UCI_Elo non supporté, repli sur profondeur")
            return False

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

    def get_best_move(
        self,
        fen: str,
        difficulty: int = 10,
        target_elo: Optional[int] = None,
    ) -> Optional[EngineMove]:
        board = chess.Board(fen)
        elo = clamp_elo(target_elo) if target_elo else None
        diff_key = min(max(difficulty, 1), 20)

        try:
            with self._get_engine() as engine:
                use_uci = (
                    elo is not None
                    and elo <= STOCKFISH_UCI_MAX_ELO
                    and self._configure_strength(engine, elo)
                )
                if use_uci:
                    limit = chess.engine.Limit(time=0.35)
                else:
                    limit = self._limit_for_elo(elo or 1200, diff_key)

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

    def analyze_game(self, pgn: str) -> list[MoveEvaluation]:
        """Full game analysis with blunder detection."""
        board = chess.Board()
        evaluations = []
        try:
            with self._get_engine() as engine:
                game = chess.pgn.read_game(chess.pgn.StringIO(pgn))
                if not game:
                    return []
                node = game
                while node.variations:
                    node = node.variation(0)
                    move = node.move
                    if not move:
                        break
                    fen_before = board.fen()
                    info_before = engine.analyse(board, chess.engine.Limit(depth=14))
                    eval_before = self._score_to_cp(info_before["score"].white())
                    san = board.san(move)
                    board.push(move)
                    info_after = engine.analyse(board, chess.engine.Limit(depth=14))
                    eval_after = self._score_to_cp(info_after["score"].white())
                    cp_loss = abs(eval_before - (-eval_after if not board.turn else eval_after))
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
