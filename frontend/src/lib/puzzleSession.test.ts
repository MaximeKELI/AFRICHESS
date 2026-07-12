import { describe, expect, it } from "vitest";
import { PuzzleSessionTracker } from "./puzzleSession";
import { canResumeTraining, type TrainingProgressSnapshot } from "./puzzleTrainingProgress";

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

  it("exportState / importState round-trip", () => {
    const a = new PuzzleSessionTracker();
    a.recordSolveOnce(baseEntry);
    a.recordSolveOnce({ ...baseEntry, puzzleId: 2 });
    const snap = a.exportState();
    const b = new PuzzleSessionTracker();
    b.importState(snap);
    expect(b.getSolvedCount()).toBe(2);
    expect(b.getPerfectStreak()).toBe(a.getPerfectStreak());
  });
});

describe("canResumeTraining", () => {
  const base: TrainingProgressSnapshot = {
    difficulty: "intermediate",
    theme: "",
    queue: [{ id: 1, fen: "8/8/8/8/8/8/8/8 w - - 0 1", solution_moves: ["e2e4"] }],
    index: 0,
    section: 1,
    entries: [],
    perfectStreak: 0,
    updatedAt: Date.now(),
  };

  it("allows resume mid-set", () => {
    expect(canResumeTraining(base)).toBe(true);
  });

  it("rejects completed set", () => {
    expect(canResumeTraining({ ...base, index: 1 })).toBe(false);
  });
});
