import { describe, expect, it } from "vitest";
import { resolveCapturedSides } from "./capturedSides";
import type { CapturedState } from "./chessDisplay";

const sample: CapturedState = {
  byWhite: ["bp", "bn"],
  byBlack: ["wp"],
  materialWhite: 4,
  materialBlack: 1,
};

describe("resolveCapturedSides", () => {
  it("places opponent captures on top when white at bottom", () => {
    const sides = resolveCapturedSides(sample, "white");
    expect(sides.top).toEqual(["wp"]);
    expect(sides.bottom).toEqual(["bp", "bn"]);
    expect(sides.bottomAdvantage).toBe(3);
    expect(sides.topAdvantage).toBeUndefined();
  });

  it("swaps sides when board is flipped", () => {
    const sides = resolveCapturedSides(sample, "black");
    expect(sides.top).toEqual(["bp", "bn"]);
    expect(sides.bottom).toEqual(["wp"]);
    expect(sides.topAdvantage).toBe(3);
  });
});
