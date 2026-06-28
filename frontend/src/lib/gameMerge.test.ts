import { describe, expect, it } from "vitest";
import { mergeApiMoves } from "@/lib/gameMerge";
import type { ApiMove } from "@/lib/chessDisplay";

describe("mergeApiMoves", () => {
  it("appends new moves", () => {
    const existing: ApiMove[] = [
      { move_number: 1, san: "e4", uci: "e2e4", played_by_white: true },
    ];
    const incoming: ApiMove[] = [
      { move_number: 1, san: "e5", uci: "e7e5", played_by_white: false },
    ];
    const merged = mergeApiMoves(existing, incoming);
    expect(merged).toHaveLength(2);
  });

  it("updates comment on existing move", () => {
    const existing: ApiMove[] = [
      { move_number: 1, san: "e4", uci: "e2e4", played_by_white: true },
    ];
    const incoming: ApiMove[] = [
      {
        move_number: 1,
        san: "e4",
        uci: "e2e4",
        played_by_white: true,
        comment: "Solide.",
      },
    ];
    const merged = mergeApiMoves(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].comment).toBe("Solide.");
  });
});
