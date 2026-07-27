import { describe, expect, it } from "vitest";
import { customPiecesForSet, isPieceSetId, PIECE_SETS } from "./pieceSets";

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

  it("returns svg renderers for lichess sets", () => {
    const pieces = customPiecesForSet("cburnett");
    expect(pieces).toBeDefined();
    expect(Object.keys(pieces!).length).toBe(12);
  });
});

describe("PIECE_SETS", () => {
  it("registers unique ids", () => {
    const ids = PIECE_SETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates known ids", () => {
    expect(isPieceSetId("merida")).toBe(true);
    expect(isPieceSetId("unknown")).toBe(false);
  });
});
