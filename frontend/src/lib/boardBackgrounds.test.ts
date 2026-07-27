import { describe, expect, it } from "vitest";
import {
  BOARD_BACKGROUNDS,
  getBoardBackground,
  isBoardBackgroundId,
} from "./boardBackgrounds";

describe("boardBackgrounds", () => {
  it("exposes at least 30 selectable backgrounds plus none", () => {
    const withImage = BOARD_BACKGROUNDS.filter((b) => b.src);
    expect(withImage.length).toBeGreaterThanOrEqual(30);
  });

  it("includes the Lichess Picture gallery (28) + landscape", () => {
    const lichess = BOARD_BACKGROUNDS.filter((b) => b.category === "lichess");
    expect(lichess).toHaveLength(29);
    expect(getBoardBackground("lichess-01").src).toContain("/lichess/bg01.webp");
    expect(getBoardBackground("lichess-28").src).toContain("/lichess/bg28.webp");
    expect(getBoardBackground("lichess-landscape").src).toContain("landscape.jpg");
    expect(isBoardBackgroundId("lichess-15")).toBe(true);
  });

  it("resolves known ids", () => {
    expect(getBoardBackground("savanna-sunset").src).toContain("savanna-sunset");
    expect(getBoardBackground("animal-tigers").src).toContain("animal-tigers.webp");
    expect(isBoardBackgroundId("none")).toBe(true);
    expect(isBoardBackgroundId("invalid")).toBe(false);
  });
});
