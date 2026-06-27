import { describe, expect, it } from "vitest";
import { openingNameFromMoves } from "./openings";

describe("openingNameFromMoves", () => {
  it("returns initial position for empty moves", () => {
    expect(openingNameFromMoves([])).toBe("Position initiale");
  });

  it("detects sicilian", () => {
    expect(openingNameFromMoves(["e4", "c5"])).toBe("Défense sicilienne");
  });

  it("detects queen's gambit declined", () => {
    expect(openingNameFromMoves(["d4", "d5"])).toBe("Gambit de la dame refusé");
  });

  it("falls back for unknown lines", () => {
    expect(openingNameFromMoves(["a4"])).toBe("Après a4");
  });
});
