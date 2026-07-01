import { describe, expect, it } from "vitest";
import { PuzzleSessionTracker } from "./puzzleSession";

const baseEntry = {
  puzzleId: 1,
  rating: 1000,
  themes: ["fork"],
  difficulty: "medium",
  wrongAttempts: 0,
  timeSeconds: 12,
  usedHint: false,
};

describe("PuzzleSessionTracker", () => {
  it("recordSolveOnce ignores duplicate puzzle ids", () => {
    const tracker = new PuzzleSessionTracker();
    expect(tracker.recordSolveOnce(baseEntry)).toBe(true);
    expect(tracker.recordSolveOnce({ ...baseEntry, timeSeconds: 20 })).toBe(false);
    expect(tracker.getSolvedCount()).toBe(1);
  });

  it("reviseOutcome flips a solve to fail", () => {
    const tracker = new PuzzleSessionTracker();
    tracker.recordSolveOnce(baseEntry);
    tracker.reviseOutcome(1, false);
    const recap = tracker.buildRecap();
    expect(recap.solved).toBe(0);
    expect(recap.failed).toBe(1);
    expect(recap.total).toBe(1);
  });
});
