/** Approximation Chess.com : eval centipawns → win % pour les blancs. */
export function evalToWinPercent(evalPawns: number, perspectiveWhite = true): number {
  const cp = (perspectiveWhite ? evalPawns : -evalPawns) * 100;
  const sigmoid = 2 / (1 + Math.exp(-0.004 * cp)) - 1;
  return Math.round(50 + 50 * sigmoid);
}

export function formatWinPercent(pct: number): string {
  if (pct >= 99) return "99+";
  if (pct <= 1) return "1-";
  return String(pct);
}
