import type { CapturedState } from "@/lib/chessDisplay";

export interface CapturedSides {
  top: string[];
  bottom: string[];
  topAdvantage?: number;
  bottomAdvantage?: number;
}

/** Pièces capturées par joueur, selon l'orientation du plateau (style Chess.com). */
export function resolveCapturedSides(
  captured: CapturedState,
  orientation: "white" | "black"
): CapturedSides {
  const whiteAhead = captured.materialWhite - captured.materialBlack;
  const blackAhead = captured.materialBlack - captured.materialWhite;

  if (orientation === "white") {
    return {
      top: captured.byBlack,
      bottom: captured.byWhite,
      topAdvantage: blackAhead > 0 ? blackAhead : undefined,
      bottomAdvantage: whiteAhead > 0 ? whiteAhead : undefined,
    };
  }

  return {
    top: captured.byWhite,
    bottom: captured.byBlack,
    topAdvantage: whiteAhead > 0 ? whiteAhead : undefined,
    bottomAdvantage: blackAhead > 0 ? blackAhead : undefined,
  };
}
