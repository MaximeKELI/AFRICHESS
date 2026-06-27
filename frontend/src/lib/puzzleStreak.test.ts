import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPuzzleStreak, recordPuzzleSolved } from "./puzzleStreak";

describe("puzzleStreak", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
    });
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
