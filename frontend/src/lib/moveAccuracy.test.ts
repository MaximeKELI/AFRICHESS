import { describe, expect, it } from "vitest";
import {
  computeMoveAccuraciesFromMoves,
  moveAccuracyFromCpLoss,
} from "./moveAccuracy";

describe("moveAccuracyFromCpLoss", () => {
  it("returns ~100 for perfect moves", () => {
    expect(moveAccuracyFromCpLoss(0)).toBeGreaterThan(99);
  });

  it("degrades with higher centipawn loss", () => {
    const low = moveAccuracyFromCpLoss(10);
    const mid = moveAccuracyFromCpLoss(80);
    const high = moveAccuracyFromCpLoss(300);
    expect(low).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(high);
    expect(high).toBeLessThan(50);
  });
});

describe("computeMoveAccuraciesFromMoves", () => {
  it("averages per side", () => {
    const result = computeMoveAccuraciesFromMoves([
      { san: "e4", eval: 0.2, class: "best", cp_loss: 0, played_by_white: true },
      { san: "e5", eval: 0.1, class: "best", cp_loss: 5, played_by_white: false },
      { san: "Nf3", eval: 0.3, class: "good", cp_loss: 20, played_by_white: true },
    ]);
    expect(result.white).not.toBeNull();
    expect(result.black).not.toBeNull();
    expect(result.white!).toBeGreaterThan(50);
    expect(result.black!).toBeGreaterThan(50);
  });
});
