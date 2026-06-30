import { describe, expect, it } from "vitest";
import { reviewBoardState, firstUserMistakeIndex } from "./reviewDisplay";

const moves = [
  {
    uci: "e2e4",
    san: "e4",
    class: "best",
    played_by_white: true,
    best_uci: "e2e4",
    best_san: "e4",
  },
  {
    uci: "e7e5",
    san: "e5",
    class: "best",
    played_by_white: false,
    best_uci: "e7e5",
    best_san: "e5",
  },
  {
    uci: "g1f3",
    san: "Nf3",
    class: "blunder",
    played_by_white: true,
    best_uci: "f1c4",
    best_san: "Bc4",
  },
];

describe("reviewBoardState", () => {
  it("shows best vs played highlight for user mistake", () => {
    const state = reviewBoardState(moves, 2, true);
    expect(state.reviewHighlight?.best).toEqual({ from: "f1", to: "c4" });
    expect(state.reviewHighlight?.played).toEqual({ from: "g1", to: "f3" });
    expect(state.moveClassBadge).toEqual({ square: "g1", moveClass: "blunder" });
  });

  it("shows badge on destination after a normal move", () => {
    const state = reviewBoardState(moves, 0, true);
    expect(state.moveClassBadge).toEqual({ square: "e4", moveClass: "best" });
  });

  it("finds first user mistake", () => {
    expect(firstUserMistakeIndex(moves, true)).toBe(2);
    expect(firstUserMistakeIndex(moves, false)).toBeNull();
  });
});
