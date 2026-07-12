import type { MessageParams } from "@/lib/i18n";

export type MoveClass = "best" | "good" | "inaccuracy" | "mistake" | "blunder";

type TranslateFn = (key: string, params?: MessageParams) => string;

export function coachPhrase(
  t: TranslateFn,
  moveClass: string,
  cpLoss?: number,
  playedByWhite?: boolean
): string {
  const side =
    playedByWhite === undefined
      ? ""
      : playedByWhite
        ? t("chess.analysis.coach.white")
        : t("chess.analysis.coach.black");
  const known = ["brilliant", "great", "best", "book", "good", "inaccuracy", "mistake", "blunder"];
  const key = known.includes(moveClass)
    ? `chess.analysis.coach.${moveClass}`
    : "chess.analysis.coach.mistake";
  const base = t(key);
  if (moveClass === "blunder" && cpLoss != null && cpLoss >= 200) {
    return t("chess.analysis.coach.blunderSevere", { side, cp: Math.round(cpLoss / 100) });
  }
  if (moveClass === "mistake" && cpLoss != null) {
    return t("chess.analysis.coach.mistakeDetail", { side, base });
  }
  return side ? `${side} — ${base}` : base;
}

export interface CoachMoveInput {
  san: string;
  class: string;
  cp_loss?: number;
  played_by_white?: boolean;
  best_san?: string | null;
}

export function isPlayerMove(move: CoachMoveInput, playerIsWhite: boolean): boolean {
  return move.played_by_white === playerIsWhite;
}

const OPPONENT_VARIANTS: Record<string, string[]> = {
  brilliant: [
    "chess.review.opponent.brilliant1",
    "chess.review.opponent.brilliant2",
    "chess.review.opponent.brilliant3",
  ],
  great: ["chess.review.opponent.great1", "chess.review.opponent.great2"],
  best: ["chess.review.opponent.best1", "chess.review.opponent.best2"],
  good: ["chess.review.opponent.good1", "chess.review.opponent.good2"],
  inaccuracy: ["chess.review.opponent.inaccuracy1", "chess.review.opponent.inaccuracy2"],
  mistake: ["chess.review.opponent.mistake1", "chess.review.opponent.mistake2"],
  blunder: ["chess.review.opponent.blunder1", "chess.review.opponent.blunder2"],
};

function pickOpponentKey(move: CoachMoveInput): string {
  const pool = OPPONENT_VARIANTS[move.class] ?? ["chess.review.opponent.neutral1", "chess.review.opponent.neutral2"];
  const idx = (move.san.length + (move.cp_loss ?? 0)) % pool.length;
  return pool[idx] ?? pool[0];
}

/** Commentaire sur un coup adverse (style revue Chess.com). */
export function coachOpponentMoveComment(t: TranslateFn, move: CoachMoveInput): string {
  const key = pickOpponentKey(move);
  let text = t(key, { san: move.san, moveClass: move.class });
  if (["mistake", "blunder"].includes(move.class) && move.best_san && move.best_san !== move.san) {
    text += ` ${t("chess.review.bestWas", { move: move.best_san })}`;
  }
  return text;
}

/** Commentaire coach centré sur le joueur humain (style revue Chess.com). */
export function coachUserMoveComment(
  t: TranslateFn,
  move: CoachMoveInput,
  playerIsWhite: boolean
): string {
  const isUser = isPlayerMove(move, playerIsWhite);
  if (!isUser) {
    return coachOpponentMoveComment(t, move);
  }

  let text = coachPhrase(t, move.class, move.cp_loss, move.played_by_white);
  const suboptimal = ["inaccuracy", "mistake", "blunder"].includes(move.class);
  if (suboptimal && move.best_san && move.best_san !== move.san) {
    text += ` ${t("chess.review.bestWas", { move: move.best_san })}`;
  } else if (["best", "great", "brilliant"].includes(move.class)) {
    text = `${t("chess.review.userPraise", { san: move.san })} ${text}`;
  }
  return text;
}

export function formatEvalDisplay(evalScore: number | null | undefined): string {
  if (evalScore == null || Number.isNaN(evalScore)) return "—";
  if (Math.abs(evalScore) >= 100) {
    const mateIn = Math.max(1, Math.round(Math.abs(evalScore) / 100));
    return evalScore > 0 ? `M${mateIn}` : `M-${mateIn}`;
  }
  return evalScore > 0 ? `+${evalScore.toFixed(1)}` : evalScore.toFixed(1);
}

/** Normalise l'eval moteur pour la barre live (−10…+10 pions). */
export function evalForBar(evalScore: number | null | undefined): number {
  if (evalScore == null || Number.isNaN(evalScore)) return 0;
  if (Math.abs(evalScore) >= 100) return evalScore > 0 ? 10 : -10;
  return Math.max(-10, Math.min(10, evalScore));
}

const CLASS_SYMBOLS: Record<string, string> = {
  brilliant: "!!",
  great: "!",
  best: "✓",
  book: "≡",
  good: "✓",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

export function moveClassSymbol(moveClass: string): string {
  return CLASS_SYMBOLS[moveClass] ?? "·";
}

export function cpLossLabel(cpLoss?: number): string | null {
  if (cpLoss == null || cpLoss < 30) return null;
  const pawns = (cpLoss / 100).toFixed(1);
  return `−${pawns}`;
}
