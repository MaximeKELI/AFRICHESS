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
  const key = `chess.analysis.coach.${moveClass}` as const;
  const base = t(key);
  if (moveClass === "blunder" && cpLoss != null && cpLoss >= 200) {
    return t("chess.analysis.coach.blunderSevere", { side, cp: Math.round(cpLoss / 100) });
  }
  if (moveClass === "mistake" && cpLoss != null) {
    return t("chess.analysis.coach.mistakeDetail", { side, base });
  }
  return side ? `${side} — ${base}` : base;
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
