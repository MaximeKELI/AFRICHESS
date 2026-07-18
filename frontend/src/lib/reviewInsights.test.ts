import { describe, expect, it } from "vitest";
import type { AnalysisMove } from "@/lib/gameAnalysis";
import {
  computePhaseAccuracies,
  countMovesByColor,
  estimateEloFromAccuracy,
} from "@/lib/reviewInsights";

function move(partial: Partial<AnalysisMove>): AnalysisMove {
  return {
    san: partial.san ?? "e4",
    eval: partial.eval ?? 0,
    class: partial.class ?? "best",
    cp_loss: partial.cp_loss ?? 0,
    played_by_white: partial.played_by_white ?? true,
    phase: partial.phase,
  };
}

describe("estimateEloFromAccuracy", () => {
  it("renvoie null si trop peu de coups", () => {
    expect(estimateEloFromAccuracy(90, 3)).toBeNull();
  });

  it("renvoie null si précision absente", () => {
    expect(estimateEloFromAccuracy(null, 20)).toBeNull();
  });

  it("interpole entre les ancrages (85% -> ~1950)", () => {
    expect(estimateEloFromAccuracy(85, 20)).toBe(1950);
  });

  it("croît avec la précision", () => {
    const low = estimateEloFromAccuracy(60, 20)!;
    const high = estimateEloFromAccuracy(95, 20)!;
    expect(high).toBeGreaterThan(low);
  });
});

describe("computePhaseAccuracies", () => {
  it("sépare les phases et les couleurs", () => {
    const moves: AnalysisMove[] = [
      move({ played_by_white: true, cp_loss: 0, phase: "opening" }),
      move({ played_by_white: false, cp_loss: 300, phase: "opening" }),
      move({ played_by_white: true, cp_loss: 0, phase: "endgame" }),
      move({ played_by_white: false, cp_loss: 0, phase: "endgame" }),
    ];
    const acc = computePhaseAccuracies(moves);
    expect(acc.opening.white).toBeGreaterThan(acc.opening.black!);
    expect(acc.endgame.white).toBe(100);
    expect(acc.middlegame.white).toBeNull();
  });

  it("déduit la phase quand elle est absente (premiers coups = ouverture)", () => {
    const moves: AnalysisMove[] = [
      move({ played_by_white: true, cp_loss: 0 }),
      move({ played_by_white: false, cp_loss: 0 }),
    ];
    const acc = computePhaseAccuracies(moves);
    expect(acc.opening.white).toBe(100);
    expect(acc.opening.black).toBe(100);
  });
});

describe("countMovesByColor", () => {
  it("compte par couleur", () => {
    const moves: AnalysisMove[] = [
      move({ played_by_white: true }),
      move({ played_by_white: false }),
      move({ played_by_white: true }),
    ];
    expect(countMovesByColor(moves)).toEqual({ white: 2, black: 1 });
  });
});
