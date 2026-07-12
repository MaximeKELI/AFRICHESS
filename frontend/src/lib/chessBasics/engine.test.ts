import { describe, expect, it } from "vitest";
import { evaluateBasicsMove } from "./engine";
import { BASICS_STAGES } from "./stages";

describe("chessBasics engine", () => {
  it("valide un coup de tour vers une case cible", () => {
    const stage = BASICS_STAGES.find((s) => s.id === "rook")!;
    const r = evaluateBasicsMove(stage.fen, "e4a4", stage.goal);
    expect(r.illegal).toBeFalsy();
    expect(r.done).toBe(true);
  });

  it("détecte le mat en un", () => {
    const stage = BASICS_STAGES.find((s) => s.id === "mate1")!;
    const r = evaluateBasicsMove(stage.fen, "f7f8", stage.goal);
    expect(r.done).toBe(true);
  });

  it("rejette un coup hors objectif", () => {
    const stage = BASICS_STAGES.find((s) => s.id === "rook")!;
    const r = evaluateBasicsMove(stage.fen, "e4c4", stage.goal);
    expect(r.illegal).toBeFalsy();
    expect(r.done).toBe(false);
  });
});
