"""Stockfish integration for AI moves and game analysis."""
from __future__ import annotations

import atexit
import io
import logging
import os
import random
import shutil
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator, Optional

import chess
import chess.engine
from django.conf import settings

from .elo_config import (
    STOCKFISH_UCI_MAX_ELO,
    STOCKFISH_UCI_MIN_ELO,
    clamp_elo,
)
from .variant_utils import apply_move as variant_apply_move
from .variant_utils import board_from_fen, pick_variant_move

logger = logging.getLogger(__name__)


class _StockfishEnginePool:
    """Un processus Stockfish réutilisé par worker (thread-safe)."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._engine: chess.engine.SimpleEngine | None = None
        self._path: str | None = None

    def _is_alive(self, engine: chess.engine.SimpleEngine) -> bool:
        try:
            engine.ping()
            return True
        except (chess.engine.EngineError, chess.engine.EngineTerminatedError, OSError):
            return False

    def _spawn(self, path: str) -> chess.engine.SimpleEngine:
        logger.debug("Stockfish pool: démarrage moteur (%s)", path)
        return chess.engine.SimpleEngine.popen_uci(path)

    def _close_unlocked(self) -> None:
        if self._engine is None:
            return
        try:
            self._engine.quit()
        except Exception:
            try:
                self._engine.terminate()
            except Exception:
                pass
        self._engine = None
        self._path = None

    def _ensure(self, path: str) -> chess.engine.SimpleEngine:
        if (
            self._engine is not None
            and self._path == path
            and self._is_alive(self._engine)
        ):
            return self._engine
        self._close_unlocked()
        self._path = path
        self._engine = self._spawn(path)
        return self._engine

    @contextmanager
    def borrow(self, path: str) -> Iterator[chess.engine.SimpleEngine]:
        with self._lock:
            engine = self._ensure(path)
            try:
                yield engine
            except (chess.engine.EngineError, chess.engine.EngineTerminatedError, OSError) as exc:
                logger.warning("Stockfish pool: reset après erreur — %s", exc)
                self._close_unlocked()
                raise

    def close(self) -> None:
        with self._lock:
            self._close_unlocked()


_stockfish_pool = _StockfishEnginePool()
atexit.register(_stockfish_pool.close)


def close_stockfish_pool() -> None:
    """Ferme le moteur partagé (tests, arrêt worker)."""
    _stockfish_pool.close()


def _resolve_stockfish_path() -> str:
    """Chemin Stockfish — env, PATH, emplacements courants."""
    configured = getattr(settings, "STOCKFISH_PATH", "") or ""
    candidates = [
        configured,
        shutil.which("stockfish") or "",
        "/usr/games/stockfish",
        "/usr/bin/stockfish",
        "/usr/local/bin/stockfish",
    ]
    for path in candidates:
        if path and os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    return configured or "/usr/games/stockfish"


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
    classification: str  # brilliant, great, best, good, inaccuracy, mistake, blunder
    best_uci: str | None = None
    best_san: str | None = None
    pv_san: str | None = None


class ChessEngineService:
    """Wrapper around Stockfish — joue à un ELO UCI quand possible."""

    # Repli profondeur si UCI indisponible (curseur 1–20)
    DIFFICULTY_DEPTH = {
        1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10, 7: 11, 8: 12, 9: 13, 10: 14,
        11: 15, 12: 16, 13: 17, 14: 18, 15: 19, 16: 20, 17: 21, 18: 22, 19: 24, 20: 26,
    }

    def __init__(self, stockfish_path: Optional[str] = None):
        self.path = stockfish_path or _resolve_stockfish_path()

    @contextmanager
    def _use_engine(self) -> Iterator[chess.engine.SimpleEngine]:
        """Emprunte le moteur du pool (ne le ferme pas entre les appels)."""
        with _stockfish_pool.borrow(self.path) as engine:
            yield engine

    def _skill_level_for_elo(self, elo: int) -> int:
        """Skill Level 0–20 : plus bas = plus faible (débutants).

        Utilisé sous le plancher UCI_Elo (~1320) et en repli. Le mapping est
        volontairement granulaire dans le bas du spectre pour ne pas surjouer.
        """
        if elo <= 500:
            return 0
        if elo <= 700:
            return 1
        if elo <= 900:
            return 2
        if elo <= 1100:
            return 3
        if elo <= STOCKFISH_UCI_MIN_ELO:
            return 4
        if elo <= 1500:
            return 6
        if elo <= 1800:
            return 9
        if elo <= 2200:
            return 13
        if elo <= 2600:
            return 17
        return 20

    def _configure_strength(self, engine, target_elo: int) -> str:
        """
        Configure la force du moteur.
        Retourne 'uci_elo', 'skill' ou 'depth' selon les options supportées.

        Deux régimes :
        - ELO < ~1320 : UCI_Elo ne descend pas assez bas et ignore Skill Level.
          On désactive UCI_LimitStrength et on pilote la faiblesse via Skill
          Level + profondeur réduite + coups aléatoires (débutants réalistes).
        - ELO >= ~1320 : UCI_Elo est calibré ; Skill Level est ignoré dans ce
          mode, on ne l'envoie donc pas (évite un cumul incohérent).
        """
        elo = min(clamp_elo(target_elo), STOCKFISH_UCI_MAX_ELO)
        skill = self._skill_level_for_elo(elo)
        slow = {"Slow Mover": 150} if elo <= 1100 else {}

        if elo < STOCKFISH_UCI_MIN_ELO:
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
                logger.warning("Skill Level non supporté, repli profondeur")
                return "depth"

        try:
            engine.configure(
                {
                    "UCI_LimitStrength": True,
                    "UCI_Elo": elo,
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
                }
            )
            return "skill"
        except chess.engine.EngineError:
            logger.warning("Skill Level non supporté, repli profondeur/ELO")
            return "depth"

    def _limit_for_weak_elo(self, elo: int) -> chess.engine.Limit:
        """Profondeur/temps calibrés pour simuler un ELO faible.

        La profondeur est le principal levier : même en Skill Level bas,
        Stockfish reste tactiquement fort si on le laisse chercher profond.
        On plafonne donc fortement la profondeur dans le bas du spectre.
        """
        if elo <= 500:
            return chess.engine.Limit(depth=1, time=0.03)
        if elo <= 800:
            return chess.engine.Limit(depth=2, time=0.05)
        if elo <= 1100:
            return chess.engine.Limit(depth=3, time=0.08)
        if elo <= 1400:
            return chess.engine.Limit(depth=5, time=0.12)
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
        """Coup aléatoire légal pour simuler les erreurs des niveaux faibles.

        Sous le plancher UCI_Elo, un vrai débutant gaffe régulièrement. On
        injecte donc une probabilité (décroissante avec l'ELO) de jouer un
        coup légal aléatoire, ce qui casse la « perfection » de Stockfish.
        """
        if elo > STOCKFISH_UCI_MIN_ELO:
            return None
        if elo <= 400:
            chance = 0.55
        elif elo <= 600:
            chance = 0.42
        elif elo <= 800:
            chance = 0.30
        elif elo <= 1000:
            chance = 0.20
        elif elo <= 1150:
            chance = 0.12
        else:
            chance = 0.06
        if random.random() > chance:
            return None
        legal = list(board.legal_moves)
        if not legal:
            return None
        move = random.choice(legal)
        return EngineMove(uci=move.uci(), san=board.san(move))

    def _pick_fallback_move(self, board: chess.Board) -> Optional[EngineMove]:
        """Coup légal de secours si Stockfish est indisponible ou plante."""
        legal = list(board.legal_moves)
        if not legal:
            return None
        best_score = -1
        candidates: list[chess.Move] = []
        for move in legal:
            score = 0
            if board.is_capture(move):
                score += 3
            if board.gives_check(move):
                score += 2
            if score > best_score:
                best_score = score
                candidates = [move]
            elif score == best_score:
                candidates.append(move)
        chosen = random.choice(candidates)
        return EngineMove(uci=chosen.uci(), san=board.san(chosen))

    def get_best_move(
        self,
        fen: str,
        difficulty: int = 10,
        target_elo: Optional[int] = None,
        variant: str = "standard",
    ) -> Optional[EngineMove]:
        if variant != "standard":
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

        last_error: Exception | None = None
        for attempt in range(2):
            try:
                with self._use_engine() as engine:
                    strength_mode = (
                        self._configure_strength(engine, elo)
                        if elo is not None and elo <= STOCKFISH_UCI_MAX_ELO
                        else "depth"
                    )
                    if strength_mode == "uci_elo":
                        limit = self._limit_for_weak_elo(elo)
                    elif strength_mode == "skill":
                        limit = self._limit_for_weak_elo(elo)
                    elif elo is not None and elo > STOCKFISH_UCI_MAX_ELO:
                        # Au-delà du plafond UCI : profondeur/temps max (GM / monstre)
                        limit = self._limit_for_elo(elo, diff_key)
                    elif elo is not None:
                        limit = self._limit_for_weak_elo(elo)
                    else:
                        limit = self._limit_for_elo(1200, diff_key)

                    result = engine.play(board, limit)
                    if result.move:
                        san = board.san(result.move)
                        return EngineMove(uci=result.move.uci(), san=san)
            except Exception as e:
                last_error = e
                logger.error(
                    "Engine error (attempt %s): %s", attempt + 1, e
                )
                if attempt == 0:
                    close_stockfish_pool()
                    continue
                break

        fallback = self._pick_fallback_move(board)
        if fallback:
            logger.warning(
                "Stockfish fallback move %s (path=%s, err=%s)",
                fallback.uci,
                self.path,
                last_error,
            )
            return fallback
        return None

    def analyze_position(self, fen: str, depth: Optional[int] = None) -> Optional[float]:
        board = chess.Board(fen)
        depth = depth or settings.ENGINE_DEPTH
        try:
            with self._use_engine() as engine:
                info = engine.analyse(board, chess.engine.Limit(depth=depth))
                score = info["score"].white()
                return self._score_to_cp(score, board) / 100.0
        except Exception as e:
            logger.error("Analysis error: %s", e)
        return None

    def best_move_san(self, fen: str, depth: int = 8) -> str | None:
        """Meilleur coup SAN sur la position (pour commentaires coaching)."""
        board = chess.Board(fen)
        try:
            with self._use_engine() as engine:
                info = engine.analyse(board, chess.engine.Limit(depth=depth))
                pv = info.get("pv") or []
                if pv and pv[0] in board.legal_moves:
                    return board.san(pv[0])
        except Exception as e:
            logger.error("Best move lookup error: %s", e)
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

    @staticmethod
    def _analysis_limit(depth: int, movetime_ms: int | None = None) -> chess.engine.Limit:
        if movetime_ms:
            return chess.engine.Limit(depth=depth, time=movetime_ms / 1000.0)
        return chess.engine.Limit(depth=depth)

    @staticmethod
    def _pv_to_san(board: chess.Board, pv: list[chess.Move]) -> str | None:
        if not pv:
            return None
        tmp = board.copy()
        sans: list[str] = []
        for pv_move in pv[:4]:
            if pv_move not in tmp.legal_moves:
                break
            sans.append(tmp.san(pv_move))
            tmp.push(pv_move)
        return " ".join(sans) if sans else None

    def analyze_game_moves(
        self,
        moves: list[tuple[str, bool]],
        depth: int = 12,
        *,
        movetime_ms: int | None = None,
    ) -> list[MoveEvaluation]:
        """Analyse une partie à partir des coups UCI (uci, played_by_white)."""
        board = chess.Board()
        evaluations: list[MoveEvaluation] = []
        limit = self._analysis_limit(depth, movetime_ms)
        try:
            with self._use_engine() as engine:
                info = engine.analyse(board, limit)
                for uci, played_by_white in moves:
                    try:
                        move = chess.Move.from_uci(uci)
                    except ValueError:
                        logger.warning("Invalid UCI in analysis: %s", uci)
                        break
                    if move not in board.legal_moves:
                        logger.warning("Illegal move in analysis: %s", uci)
                        break
                    eval_before = self._score_to_cp(info["score"].white())
                    pv = info.get("pv") or []
                    best_move = pv[0] if pv else None
                    best_san = board.san(best_move) if best_move else None
                    best_uci = best_move.uci() if best_move else None
                    pv_san = self._pv_to_san(board, pv)
                    san = board.san(move)
                    is_best = best_move is not None and move == best_move
                    board.push(move)
                    # Position terminée (mat, pat, nulle) : ne pas ré-analyser
                    # une position sans coup légal — on lit le résultat.
                    terminal = board.is_game_over(claim_draw=False)
                    if terminal:
                        eval_after = self._terminal_eval_cp(board)
                    else:
                        info = engine.analyse(board, limit)
                        eval_after = self._score_to_cp(info["score"].white())
                    if played_by_white:
                        cp_loss = max(0, eval_before - eval_after)
                        eval_gain = eval_after - eval_before
                    else:
                        cp_loss = max(0, eval_after - eval_before)
                        eval_gain = eval_before - eval_after
                    classification = self._classify_move(
                        cp_loss, eval_gain, is_best, ply=len(evaluations)
                    )
                    # Le coup qui donne mat conclut la partie de la meilleure
                    # façon possible : il ne doit jamais être compté comme une
                    # erreur ni faire chuter la précision du gagnant.
                    if terminal and board.is_checkmate():
                        cp_loss = 0
                        classification = "best"
                    evaluations.append(
                        MoveEvaluation(
                            uci=move.uci(),
                            san=san,
                            eval_before=eval_before / 100,
                            eval_after=eval_after / 100,
                            centipawn_loss=cp_loss,
                            classification=classification,
                            best_uci=best_uci,
                            best_san=best_san,
                            pv_san=pv_san,
                        )
                    )
                    if terminal:
                        break
        except Exception as e:
            logger.error("Game analysis error: %s", e)
        return evaluations

    @staticmethod
    def _score_to_cp(score, board: chess.Board | None = None) -> int:
        """Score (point de vue Blancs) en centipions.

        Gère le cas `Mate(0)` : à une position déjà mat, python-chess renvoie
        un mat de distance 0 dont le signe est perdu. On lève l'ambiguïté avec
        `board.turn` (le camp au trait est le camp maté), sinon un mat livré par
        les Blancs était compté −10000 (donc une gaffe monumentale).
        """
        if score.is_mate():
            mate = score.mate()
            if mate is None:
                return 0
            if mate > 0:
                return 10000
            if mate < 0:
                return -10000
            # mate == 0 : position déjà mat — le camp au trait a perdu.
            if board is not None and board.is_checkmate():
                return -10000 if board.turn == chess.WHITE else 10000
            return 0
        return score.score() or 0

    @staticmethod
    def _terminal_eval_cp(board: chess.Board) -> int:
        """Évaluation (point de vue Blancs) d'une position terminée."""
        outcome = board.outcome(claim_draw=False)
        if outcome is None or outcome.winner is None:
            return 0  # nulle (pat, matériel insuffisant, etc.)
        return 10000 if outcome.winner == chess.WHITE else -10000

    @staticmethod
    def _classify_move(
        cp_loss: int,
        eval_gain: int = 0,
        is_best: bool = False,
        *,
        ply: int | None = None,
    ) -> str:
        # Ouverture : coup théorique (livre) si proche du meilleur
        if ply is not None and ply < 16 and cp_loss <= 20 and (
            is_best or cp_loss <= 10
        ):
            return "book"
        if cp_loss <= 3 and eval_gain >= 120:
            return "brilliant"
        if cp_loss <= 5 and is_best and eval_gain >= 40:
            return "great"
        if cp_loss <= 10:
            return "best"
        if cp_loss <= 25:
            return "good"
        if cp_loss <= 50:
            return "inaccuracy"
        if cp_loss <= 100:
            return "mistake"
        return "blunder"

    def evaluate_played_move(
        self,
        fen_before: str,
        uci: str,
        played_by_white: bool,
        *,
        ply: int = 0,
        depth: int = 14,
    ) -> MoveEvaluation | None:
        """Classifie un coup joué (eval avant/après + nature du coup)."""
        board = chess.Board(fen_before)
        try:
            move = chess.Move.from_uci(uci)
        except ValueError:
            return None
        if move not in board.legal_moves:
            return None
        limit = chess.engine.Limit(depth=depth)
        try:
            with self._use_engine() as engine:
                info = engine.analyse(board, limit)
                eval_before = self._score_to_cp(info["score"].white())
                pv = info.get("pv") or []
                best_move = pv[0] if pv else None
                best_san = board.san(best_move) if best_move else None
                best_uci = best_move.uci() if best_move else None
                pv_san = self._pv_to_san(board, pv)
                san = board.san(move)
                is_best = best_move is not None and move == best_move
                board.push(move)
                terminal = board.is_game_over(claim_draw=False)
                if terminal:
                    eval_after = self._terminal_eval_cp(board)
                else:
                    info_after = engine.analyse(board, limit)
                    eval_after = self._score_to_cp(info_after["score"].white())
            if played_by_white:
                cp_loss = max(0, eval_before - eval_after)
                eval_gain = eval_after - eval_before
            else:
                cp_loss = max(0, eval_after - eval_before)
                eval_gain = eval_before - eval_after
            classification = self._classify_move(cp_loss, eval_gain, is_best, ply=ply)
            if terminal and board.is_checkmate():
                cp_loss = 0
                classification = "best"
            return MoveEvaluation(
                uci=move.uci(),
                san=san,
                eval_before=eval_before / 100,
                eval_after=eval_after / 100,
                centipawn_loss=cp_loss,
                classification=classification,
                best_uci=best_uci,
                best_san=best_san,
                pv_san=pv_san,
            )
        except Exception as e:
            logger.error("evaluate_played_move error: %s", e)
            return None

    def is_legal_move(self, fen: str, uci: str, variant: str = "standard") -> bool:
        board = board_from_fen(fen, variant)
        try:
            move = chess.Move.from_uci(uci)
            return move in board.legal_moves
        except ValueError:
            return False

    def apply_move(
        self, fen: str, uci: str, variant: str = "standard"
    ) -> Optional[tuple[str, str, bool]]:
        """Returns (new_fen, san, is_game_over) or None if illegal."""
        if variant != "standard":
            return variant_apply_move(fen, uci, variant)
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
