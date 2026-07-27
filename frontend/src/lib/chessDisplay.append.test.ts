import { describe, expect, it } from "vitest";
import {
  appendApiMovesToDisplay,
  buildGameDisplayFromFen,
  buildGameDisplayFromMoves,
  type ApiMove,
} from "./chessDisplay";

describe("appendApiMovesToDisplay", () => {
  it("returns null when cache fen already includes the first new move (optimistic)", () => {
    const moves: ApiMove[] = [
      { uci: "e2e4", san: "e4", played_by_white: true, move_number: 1 },
      { uci: "e7e5", san: "e5", played_by_white: false, move_number: 1 },
    ];
    const afterPlayer = buildGameDisplayFromMoves("start", [moves[0]]);
    const result = appendApiMovesToDisplay(afterPlayer, moves);
    expect(result).toBeNull();
  });

  it("appends cleanly from a matching cache", () => {
    const base = buildGameDisplayFromFen("start");
    const moves: ApiMove[] = [
      { uci: "g1f3", san: "Nf3", played_by_white: true, move_number: 1 },
      { uci: "d7d5", san: "d5", played_by_white: false, move_number: 1 },
    ];
    const next = appendApiMovesToDisplay(base, moves);
    expect(next).not.toBeNull();
    expect(next!.fen).toBe(buildGameDisplayFromMoves("start", moves).fen);
  });
});
