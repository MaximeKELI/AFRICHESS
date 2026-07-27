import { describe, expect, it } from "vitest";
import {
  BOARD_BACKGROUNDS,
  BOARD_BACKGROUND_CATEGORY_ORDER,
  getBoardBackground,
  isBoardBackgroundId,
  backgroundsInCategory,
} from "./boardBackgrounds";

describe("boardBackgrounds", () => {
  it("exposes at least 30 selectable backgrounds plus none", () => {
    const withImage = BOARD_BACKGROUNDS.filter((b) => b.src);
    expect(withImage.length).toBeGreaterThanOrEqual(30);
  });

  it("includes the Lichess Picture gallery (28) + landscape", () => {
    const gallery = BOARD_BACKGROUNDS.filter((b) => b.category === "gallery");
    expect(gallery).toHaveLength(29);
    expect(getBoardBackground("lichess-01").src).toContain("/lichess/bg01.webp");
    expect(getBoardBackground("lichess-28").src).toContain("/lichess/bg28.webp");
    expect(getBoardBackground("lichess-landscape").src).toContain("landscape.jpg");
    expect(isBoardBackgroundId("lichess-15")).toBe(true);
  });

  it("resolves known ids and keeps thematic categories separated", () => {
    expect(getBoardBackground("savanna-sunset").src).toContain("savanna-sunset");
    expect(getBoardBackground("animal-tigers").src).toContain("animal-tigers.webp");
    expect(getBoardBackground("animal-tigers").category).toBe("animals");
    expect(getBoardBackground("sahara-dunes").category).toBe("desert");
    expect(getBoardBackground("rainforest").category).toBe("forest");
    expect(getBoardBackground("kilimanjaro").category).toBe("mountains");
    expect(isBoardBackgroundId("none")).toBe(true);
    expect(isBoardBackgroundId("invalid")).toBe(false);
  });

  it("lists every category in the display order", () => {
    for (const cat of BOARD_BACKGROUND_CATEGORY_ORDER) {
      expect(backgroundsInCategory(cat).length).toBeGreaterThan(0);
    }
  });

  it("uses thumbnails for heavy Lichess gallery assets", () => {
    const g = getBoardBackground("lichess-07");
    expect(g.thumbSrc).toContain("/thumbs/bg07.webp");
    expect(g.src).toContain("/lichess/bg07.webp");
    expect(getBoardBackground("lichess-landscape").thumbSrc).toContain("thumbs/landscape.webp");
  });
});
