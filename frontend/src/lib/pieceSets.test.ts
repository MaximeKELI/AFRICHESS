import { describe, expect, it } from "vitest";
import { customPiecesForSet } from "./pieceSets";

describe("customPiecesForSet", () => {
  it("returns undefined for classic set", () => {
    expect(customPiecesForSet("classic")).toBeUndefined();
  });

  it("returns all piece keys for african set", () => {
    const pieces = customPiecesForSet("african");
    expect(pieces).toBeDefined();
    expect(Object.keys(pieces!)).toEqual(
      expect.arrayContaining(["wP", "wK", "bP", "bK"])
    );
  });
});
