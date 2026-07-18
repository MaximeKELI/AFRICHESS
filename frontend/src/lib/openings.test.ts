import { describe, expect, it } from "vitest";
import { openingInfoFromMoves, openingNameFromMoves } from "./openings";

describe("openingNameFromMoves", () => {
  it("returns initial position for empty moves", () => {
    expect(openingNameFromMoves([])).toBe("Position initiale");
  });

  it("detects sicilian", () => {
    expect(openingNameFromMoves(["e4", "c5"])).toBe("Défense sicilienne");
  });

  it("detects the Queen's Gambit Declined by full line", () => {
    expect(openingNameFromMoves(["d4", "d5", "c4", "e6"])).toBe("Gambit dame refusé");
  });

  it("recognizes Bird's Opening for 1. f4 (was previously unnamed)", () => {
    expect(openingNameFromMoves(["f4"])).toContain("oiseau");
  });

  it("uses the longest named prefix and returns the ECO code", () => {
    const info = openingInfoFromMoves(["e4", "c5", "Nf3", "d6"]);
    expect(info.name.toLowerCase()).toContain("sicil");
    expect(info.eco).toMatch(/^B/);
  });

  it("supports English names", () => {
    expect(openingNameFromMoves(["e4", "c5"], "en")).toBe("Sicilian Defense");
  });

  it("falls back gracefully for an unknown token", () => {
    expect(openingNameFromMoves(["Zz9"])).toBe("Après Zz9");
  });
});
