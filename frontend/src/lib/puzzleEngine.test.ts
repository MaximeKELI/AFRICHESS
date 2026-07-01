import { describe, expect, it } from "vitest";
import {
  alignMovesToSolution,
  applyPuzzleMove,
  buildPuzzleFen,
  nextPlayerSolutionMove,
  uciEquals,
} from "./puzzleEngine";

describe("nextPlayerSolutionMove", () => {
  it("returns first white move from start", () => {
    const fen = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";
    const solution = ["h5f7"];
    expect(nextPlayerSolutionMove(fen, solution, [])).toBe("h5f7");
  });

  it("returns black move when black to play", () => {
    const fen = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 4";
    const solution = ["f6g4", "h5g4"];
    expect(nextPlayerSolutionMove(fen, solution, [])).toBe("f6g4");
  });

  it("returns second player move after opponent reply in played", () => {
    const fen = "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4";
    const solution = ["c4f7", "e8f7", "f3g5"];
    const played = ["c4f7", "e8f7"];
    expect(nextPlayerSolutionMove(fen, solution, played)).toBe("f3g5");
  });

  it("skips opponent turn in solution when index points to opponent move", () => {
    const fen = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 4";
    const solution = ["f6g4", "h5g4"];
    // played vide mais on simule un décalage : index 0 = coup noir, OK
    expect(nextPlayerSolutionMove(fen, solution, [])).toBe("f6g4");
  });
});

describe("uciEquals", () => {
  it("treats missing promotion as queen", () => {
    expect(uciEquals("e7e8", "e7e8q")).toBe(true);
    expect(uciEquals("e7e8q", "e7e8")).toBe(true);
  });
});

describe("applyPuzzleMove", () => {
  it("accepts promotion shorthand matching solution", () => {
    const fen = "8/4P3/8/8/8/8/8/4K2k w - - 0 1";
    const solution = ["e7e8q"];
    const result = applyPuzzleMove(fen, solution, [], "e7e8");
    expect(result.wrong).toBe(false);
    expect(result.complete).toBe(true);
  });

  it("auto-plays opponent replies", () => {
    const fen = "r1bqk2r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4";
    const solution = ["c4f7", "e8f7", "f3g5"];
    const result = applyPuzzleMove(fen, solution, [], "c4f7");
    expect(result.wrong).toBe(false);
    expect(result.moves).toEqual(["c4f7", "e8f7"]);
    expect(nextPlayerSolutionMove(fen, solution, result.moves)).toBe("f3g5");
    expect(buildPuzzleFen(fen, result.moves)).toBe(result.fen);
  });
});

describe("alignMovesToSolution", () => {
  it("uses exact solution notation including promotion", () => {
    const solution = ["e7e8q", "a8b8"];
    expect(alignMovesToSolution(["e7e8", "a8b8"], solution)).toEqual(solution);
  });
});
