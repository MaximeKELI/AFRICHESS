"""Stockfish integration for AI moves and game analysis."""
import logging
from dataclasses import dataclass
from typing import Optional

import chess
import chess.engine
from django.conf import settings

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
    """Wrapper around Stockfish for AI play and analysis."""

    DIFFICULTY_DEPTH = {1: 5, 2: 7, 3: 9, 4: 11, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21, 10: 23}

    def __init__(self, stockfish_path: Optional[str] = None):
        self.path = stockfish_path or settings.STOCKFISH_PATH

    def _get_engine(self):
        return chess.engine.SimpleEngine.popen_uci(self.path)

    def get_best_move(self, fen: str, difficulty: int = 5) -> Optional[EngineMove]:
        board = chess.Board(fen)
        depth = self.DIFFICULTY_DEPTH.get(min(max(difficulty, 1), 10), 13)
        try:
            with self._get_engine() as engine:
                result = engine.play(board, chess.engine.Limit(depth=depth))
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
