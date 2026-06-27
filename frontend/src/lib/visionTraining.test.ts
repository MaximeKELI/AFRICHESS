import { describe, expect, it } from "vitest";
import { isValidSquare, randomCoordinate, squareColor } from "./visionTraining";

describe("visionTraining", () => {
  it("génère des coordonnées valides", () => {
    for (let i = 0; i < 20; i++) {
      expect(isValidSquare(randomCoordinate())).toBe(true);
    }
  });

  it("détecte la couleur de case", () => {
    expect(squareColor("a1")).toBe("dark");
    expect(squareColor("a2")).toBe("light");
  });
});
