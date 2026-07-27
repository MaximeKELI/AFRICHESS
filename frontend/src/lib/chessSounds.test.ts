import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { inferSoundFromFenChange, soundForMove, soundForSan } from "./chessSounds";

describe("soundForMove", () => {
  it("détecte mat, échec, prise, roque et coup simple", () => {
    expect(soundForMove("", "Qh7#")).toBe("checkmate");
    expect(soundForMove("", "Nf6+")).toBe("check");
    expect(soundForMove("c", "Nxe5")).toBe("capture");
    expect(soundForMove("e", "exd6")).toBe("capture");
    expect(soundForMove("k", "O-O")).toBe("castle");
    expect(soundForMove("q", "O-O-O")).toBe("castle");
    expect(soundForMove("n", "e4")).toBe("move");
  });
});

describe("soundForSan", () => {
  it("détecte depuis le SAN seul (relecture)", () => {
    expect(soundForSan("e4")).toBe("move");
    expect(soundForSan("Nxe5")).toBe("capture");
    expect(soundForSan("exd6")).toBe("capture");
    expect(soundForSan("Nf6+")).toBe("check");
    expect(soundForSan("Qh7#")).toBe("checkmate");
    expect(soundForSan("O-O")).toBe("castle");
    expect(soundForSan("O-O-O")).toBe("castle");
  });
});

describe("inferSoundFromFenChange — parties live (FEN sans historique)", () => {
  it("coup simple e2e4", () => {
    const start = new Chess();
    const after = new Chess();
    after.move("e4");
    expect(inferSoundFromFenChange(start.fen(), after.fen(), { from: "e2", to: "e4" })).toBe(
      "move"
    );
  });

  it("prise", () => {
    const before = new Chess("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2");
    const after = new Chess(before.fen());
    after.move("exd5");
    expect(
      inferSoundFromFenChange(before.fen(), after.fen(), { from: "e4", to: "d5" })
    ).toBe("capture");
  });

  it("échec", () => {
    const before = new Chess("4k3/8/8/8/8/8/8/R3K3 w Q - 0 1");
    const after = new Chess(before.fen());
    after.move("Ra8");
    expect(
      inferSoundFromFenChange(before.fen(), after.fen(), { from: "a1", to: "a8" })
    ).toBe("check");
  });

  it("mat", () => {
    const before = new Chess("rnbqkbnr/ppppp2p/5p2/6p1/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3");
    const after = new Chess(before.fen());
    after.move("Qh5");
    expect(
      inferSoundFromFenChange(before.fen(), after.fen(), { from: "d1", to: "h5" })
    ).toBe("checkmate");
  });

  it("roque petit", () => {
    const before = new Chess("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1");
    const after = new Chess(before.fen());
    after.move("O-O");
    expect(
      inferSoundFromFenChange(before.fen(), after.fen(), { from: "e1", to: "g1" })
    ).toBe("castle");
  });

  it("sans lastMove trouve quand même le coup unique", () => {
    const start = new Chess();
    const after = new Chess();
    after.move("e4");
    expect(inferSoundFromFenChange(start.fen(), after.fen())).toBe("move");
  });

  it("saut multi-coups → null (pas de son parasite)", () => {
    const start = new Chess();
    const mid = new Chess();
    mid.move("e4");
    mid.move("e5");
    mid.move("Nf3");
    expect(inferSoundFromFenChange(start.fen(), mid.fen())).toBeNull();
  });

  it("accepte fen 'start'", () => {
    const after = new Chess();
    after.move("e4");
    expect(inferSoundFromFenChange("start", after.fen(), { from: "e2", to: "e4" })).toBe(
      "move"
    );
  });
});
