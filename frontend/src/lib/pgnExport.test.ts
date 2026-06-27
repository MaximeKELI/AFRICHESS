import { describe, expect, it } from "vitest";
import { buildPgn } from "./pgnExport";

describe("buildPgn", () => {
  it("utilise le PGN serveur si présent", () => {
    expect(buildPgn({ pgn: "1. e4 e5" })).toBe("1. e4 e5");
  });

  it("construit un PGN depuis les coups SAN", () => {
    const pgn = buildPgn({
      moves: [{ san: "e4" }, { san: "e5" }, { san: "Nf3" }] as never[],
      white: "Alice",
      black: "Bob",
      result: "1-0",
    });
    expect(pgn).toContain('[White "Alice"]');
    expect(pgn).toContain("1. e4 e5 2. Nf3 1-0");
  });
});
