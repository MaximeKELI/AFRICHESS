import type { MessageParams } from "@/lib/i18n";

export type MoveClass = "best" | "good" | "inaccuracy" | "mistake" | "blunder";

type TranslateFn = (key: string, params?: MessageParams) => string;

const COACH_POOLS: Record<string, string[]> = {
  brilliant: [
    "chess.analysis.coach.brilliant",
    "chess.analysis.coach.brilliant2",
    "chess.analysis.coach.brilliant3",
  ],
  great: [
    "chess.analysis.coach.great",
    "chess.analysis.coach.great2",
    "chess.analysis.coach.great3",
  ],
  best: [
    "chess.analysis.coach.best",
    "chess.analysis.coach.best2",
    "chess.analysis.coach.best3",
  ],
  book: ["chess.analysis.coach.book", "chess.analysis.coach.book2"],
  good: [
    "chess.analysis.coach.good",
    "chess.analysis.coach.good2",
    "chess.analysis.coach.good3",
  ],
  inaccuracy: [
    "chess.analysis.coach.inaccuracy",
    "chess.analysis.coach.inaccuracy2",
    "chess.analysis.coach.inaccuracy3",
  ],
  mistake: [
    "chess.analysis.coach.mistake",
    "chess.analysis.coach.mistake2",
    "chess.analysis.coach.mistake3",
  ],
  blunder: [
    "chess.analysis.coach.blunder",
    "chess.analysis.coach.blunder2",
    "chess.analysis.coach.blunder3",
  ],
};

const OPPONENT_VARIANTS: Record<string, string[]> = {
  brilliant: [
    "chess.review.opponent.brilliant1",
    "chess.review.opponent.brilliant2",
    "chess.review.opponent.brilliant3",
  ],
  great: [
    "chess.review.opponent.great1",
    "chess.review.opponent.great2",
    "chess.review.opponent.great3",
  ],
  best: [
    "chess.review.opponent.best1",
    "chess.review.opponent.best2",
    "chess.review.opponent.best3",
  ],
  good: [
    "chess.review.opponent.good1",
    "chess.review.opponent.good2",
    "chess.review.opponent.good3",
  ],
  inaccuracy: [
    "chess.review.opponent.inaccuracy1",
    "chess.review.opponent.inaccuracy2",
    "chess.review.opponent.inaccuracy3",
  ],
  mistake: [
    "chess.review.opponent.mistake1",
    "chess.review.opponent.mistake2",
    "chess.review.opponent.mistake3",
  ],
  blunder: [
    "chess.review.opponent.blunder1",
    "chess.review.opponent.blunder2",
    "chess.review.opponent.blunder3",
  ],
};

const BEST_WAS_KEYS = [
  "chess.review.bestWas",
  "chess.review.bestWas2",
  "chess.review.bestWas3",
];

const USER_PRAISE_KEYS = [
  "chess.review.userPraise",
  "chess.review.userPraise2",
  "chess.review.userPraise3",
  "chess.review.userPraise4",
];

function pickFromPool(pool: string[], seed: string): string {
  if (!pool.length) return "";
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  // Mélange déterministe + aléatoire pour éviter les boucles répétitives
  const jitter = typeof crypto !== "undefined" && "getRandomValues" in crypto
    ? crypto.getRandomValues(new Uint32Array(1))[0] % pool.length
    : Math.floor(Math.random() * pool.length);
  const idx = (h + jitter) % pool.length;
  return pool[idx] ?? pool[0];
}

export function coachPhrase(
  t: TranslateFn,
  moveClass: string,
  cpLoss?: number,
  playedByWhite?: boolean,
  seed = ""
): string {
  const side =
    playedByWhite === undefined
      ? ""
      : playedByWhite
        ? t("chess.analysis.coach.white")
        : t("chess.analysis.coach.black");
  if (moveClass === "blunder" && cpLoss != null && cpLoss >= 200) {
    return t("chess.analysis.coach.blunderSevere", { side, cp: Math.round(cpLoss / 100) });
  }
  const pool = COACH_POOLS[moveClass] ?? COACH_POOLS.mistake;
  const key = pickFromPool(pool, `${moveClass}|${seed}|${cpLoss ?? 0}`);
  const base = t(key);
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

function pickOpponentKey(move: CoachMoveInput): string {
  const pool =
    OPPONENT_VARIANTS[move.class] ??
    [
      "chess.review.opponent.neutral1",
      "chess.review.opponent.neutral2",
      "chess.review.opponent.neutral3",
    ];
  return pickFromPool(pool, `${move.san}|${move.class}|${move.cp_loss ?? 0}`);
}

function bestWasLine(t: TranslateFn, move: CoachMoveInput): string {
  if (!move.best_san || move.best_san === move.san) return "";
  const key = pickFromPool(BEST_WAS_KEYS, `${move.san}|${move.best_san}`);
  return ` ${t(key, { move: move.best_san })}`;
}

/** Commentaire sur un coup adverse. */
export function coachOpponentMoveComment(t: TranslateFn, move: CoachMoveInput): string {
  const key = pickOpponentKey(move);
  let text = t(key, { san: move.san, moveClass: move.class });
  if (["mistake", "blunder"].includes(move.class)) {
    text += bestWasLine(t, move);
  }
  return text;
}

/** Commentaire coach centré sur le joueur humain. */
export function coachUserMoveComment(
  t: TranslateFn,
  move: CoachMoveInput,
  playerIsWhite: boolean
): string {
  const isUser = isPlayerMove(move, playerIsWhite);
  if (!isUser) {
    return coachOpponentMoveComment(t, move);
  }

  let text = coachPhrase(
    t,
    move.class,
    move.cp_loss,
    move.played_by_white,
    move.san
  );
  const suboptimal = ["inaccuracy", "mistake", "blunder"].includes(move.class);
  if (suboptimal) {
    text += bestWasLine(t, move);
  } else if (["best", "great", "brilliant"].includes(move.class)) {
    const praise = pickFromPool(USER_PRAISE_KEYS, move.san);
    text = `${t(praise, { san: move.san })} ${text}`;
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
