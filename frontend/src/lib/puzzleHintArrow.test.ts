import { describe, expect, it } from "vitest";
import { hintArrowWaypoints, squareToFileRank } from "./puzzleHintArrow";

describe("hintArrowWaypoints", () => {
  it("rook: straight line", () => {
    const pts = hintArrowWaypoints("e2", "e5", "r");
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual(squareToFileRank("e2"));
    expect(pts[1]).toEqual(squareToFileRank("e5"));
  });

  it("bishop: diagonal line", () => {
    const pts = hintArrowWaypoints("c1", "f4", "b");
    expect(pts).toHaveLength(2);
  });

  it("knight: L-shaped path", () => {
    const pts = hintArrowWaypoints("g1", "f3", "n");
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual(squareToFileRank("g1"));
    expect(pts[2]).toEqual(squareToFileRank("f3"));
  });
});
