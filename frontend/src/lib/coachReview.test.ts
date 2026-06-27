import { describe, expect, it } from "vitest";
import { coachPhrase, evalForBar, formatEvalDisplay } from "./coachReview";

const t = (key: string, params?: Record<string, string | number>) => {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
};

describe("formatEvalDisplay", () => {
  it("returns dash for null", () => {
    expect(formatEvalDisplay(null)).toBe("—");
  });

  it("formats centipawn eval", () => {
    expect(formatEvalDisplay(1.5)).toBe("+1.5");
    expect(formatEvalDisplay(-2.3)).toBe("-2.3");
  });

  it("formats mate scores", () => {
    expect(formatEvalDisplay(300)).toBe("M3");
    expect(formatEvalDisplay(-250)).toBe("M-3");
  });
});

describe("evalForBar", () => {
  it("clamps centipawn eval", () => {
    expect(evalForBar(5)).toBe(5);
    expect(evalForBar(15)).toBe(10);
  });

  it("maps mate to bar extremes", () => {
    expect(evalForBar(500)).toBe(10);
    expect(evalForBar(-500)).toBe(-10);
  });
});

describe("coachPhrase", () => {
  it("uses blunder severe template for large cp loss", () => {
    const phrase = coachPhrase(t, "blunder", 250, true);
    expect(phrase).toContain("chess.analysis.coach.blunderSevere");
  });

  it("prefixes side when provided", () => {
    const phrase = coachPhrase(t, "best", 0, false);
    expect(phrase).toContain("chess.analysis.coach.black");
  });
});
