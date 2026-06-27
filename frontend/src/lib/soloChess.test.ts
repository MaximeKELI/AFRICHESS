import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { SOLO_LEVELS, soloLegalMoves, soloVictory } from "./soloChess";

describe("soloChess", () => {
  it("a des niveaux de départ", () => {
    expect(SOLO_LEVELS.length).toBeGreaterThanOrEqual(3);
  });

  it("soloVictory quand une pièce reste", () => {
    const c = new Chess("k7/8/8/8/8/8/8/4Q2K w - - 0 1");
    expect(soloVictory(c)).toBe(true);
  });

  it("soloLegalMoves retourne des coups", () => {
    const c = new Chess(SOLO_LEVELS[0].fen);
    expect(soloLegalMoves(c).length).toBeGreaterThan(0);
  });
});
