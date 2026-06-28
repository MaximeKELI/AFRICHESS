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

  it("resolves known ids", () => {
    expect(getBoardBackground("savanna-sunset").src).toContain("savanna-sunset");
    expect(isBoardBackgroundId("none")).toBe(true);
    expect(isBoardBackgroundId("invalid")).toBe(false);
  });
});
