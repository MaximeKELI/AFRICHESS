import type { TFunction } from "@/lib/i18n";

export type MoveClass = "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export function coachPhrase(
  t: TFunction,
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
  if (Math.abs(evalScore) >= 50) {
    const mateIn = Math.max(1, Math.round(100 / Math.max(Math.abs(evalScore) - 90, 1)));
    return evalScore > 0 ? `#${mateIn}` : `#-${mateIn}`;
  }
  const pawns = evalScore / 100;
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}
