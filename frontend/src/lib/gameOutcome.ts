/** Résultat de partie du point de vue du joueur local. */

export type PlayerOutcome = "win" | "loss" | "draw";

export function computePlayerOutcome(
  result: string | null | undefined,
  playerIsWhite: boolean
): PlayerOutcome | null {
  if (!result) return null;
  if (result === "1/2-1/2") return "draw";
  if (result === "1-0") return playerIsWhite ? "win" : "loss";
  if (result === "0-1") return playerIsWhite ? "loss" : "win";
  return null;
}
