export type GamePhase = "opening" | "middlegame" | "endgame";

export function inferMovePhase(ply: number): GamePhase {
  const moveNum = Math.floor(ply / 2) + 1;
  if (moveNum <= 10) return "opening";
  if (moveNum >= 35) return "endgame";
  return "middlegame";
}

export function phaseLabelKey(phase: GamePhase): string {
  return `chess.review.phase.${phase}`;
}
