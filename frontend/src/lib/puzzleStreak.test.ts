import { afterEach, describe, expect, it } from "vitest";
import { getPuzzleStreak, recordPuzzleSolved } from "./puzzleStreak";

describe("puzzleStreak", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("starts at zero", () => {
    expect(getPuzzleStreak()).toBe(0);
  });

  it("increments on success", () => {
    expect(recordPuzzleSolved(true)).toBe(1);
    expect(recordPuzzleSolved(true)).toBe(2);
  });

  it("resets on failure", () => {
    recordPuzzleSolved(true);
    recordPuzzleSolved(true);
    expect(recordPuzzleSolved(false)).toBe(0);
    expect(getPuzzleStreak()).toBe(0);
  });
});
