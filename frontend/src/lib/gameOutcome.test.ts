import { describe, expect, it } from "vitest";
import { computePlayerOutcome } from "./gameOutcome";

describe("computePlayerOutcome", () => {
  it("white win when playing white", () => {
    expect(computePlayerOutcome("1-0", true)).toBe("win");
    expect(computePlayerOutcome("1-0", false)).toBe("loss");
  });

  it("black win when playing black", () => {
    expect(computePlayerOutcome("0-1", false)).toBe("win");
    expect(computePlayerOutcome("0-1", true)).toBe("loss");
  });

  it("draw for both sides", () => {
    expect(computePlayerOutcome("1/2-1/2", true)).toBe("draw");
    expect(computePlayerOutcome("1/2-1/2", false)).toBe("draw");
  });

  it("returns null without result", () => {
    expect(computePlayerOutcome(null, true)).toBeNull();
    expect(computePlayerOutcome(undefined, false)).toBeNull();
  });
});
