import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { isPawnPromotion, type BoardPiece } from "./promotion";

const P = (type: string, color: "w" | "b"): BoardPiece => ({ type, color });

describe("isPawnPromotion — logique pure", () => {
  it("pion blanc atteignant la 8e rangée → promotion", () => {
    expect(isPawnPromotion(P("p", "w"), "e8")).toBe(true);
    expect(isPawnPromotion(P("p", "w"), "a8")).toBe(true);
  });

  it("pion noir atteignant la 1re rangée → promotion", () => {
    expect(isPawnPromotion(P("p", "b"), "e1")).toBe(true);
    expect(isPawnPromotion(P("p", "b"), "h1")).toBe(true);
  });

  it("pion n'atteignant PAS la dernière rangée → pas de promotion", () => {
    expect(isPawnPromotion(P("p", "w"), "e4")).toBe(false);
    expect(isPawnPromotion(P("p", "b"), "e5")).toBe(false);
    expect(isPawnPromotion(P("p", "w"), "e7")).toBe(false);
  });

  it("AUCUNE autre pièce sur la dernière rangée ne promeut (le bug)", () => {
    for (const t of ["r", "n", "b", "q", "k"]) {
      expect(isPawnPromotion(P(t, "w"), "e8")).toBe(false);
      expect(isPawnPromotion(P(t, "b"), "e1")).toBe(false);
    }
  });

  it("mauvaise rangée pour la couleur → pas de promotion", () => {
    // Un pion blanc ne promeut jamais en rangée 1 (impossible), noir jamais en 8.
    expect(isPawnPromotion(P("p", "w"), "e1")).toBe(false);
    expect(isPawnPromotion(P("p", "b"), "e8")).toBe(false);
  });

  it("case vide → pas de promotion", () => {
    expect(isPawnPromotion(null, "e8")).toBe(false);
    expect(isPawnPromotion(undefined, "e1")).toBe(false);
  });
});

describe("isPawnPromotion — cas réels via chess.js", () => {
  it("tour arrivant sur la 8e rangée (Ra7-a8) NE déclenche PAS de promotion", () => {
    // Tour blanche en a7, roi noir loin : Ra7-a8 est légal et non-promotion.
    const chess = new Chess("4k3/R7/8/8/8/8/8/4K3 w - - 0 1");
    const piece = chess.get("a7");
    expect(piece).toEqual({ type: "r", color: "w" });
    expect(isPawnPromotion(piece, "a8")).toBe(false);
    // Le coup a7a8 (sans suffixe) doit être légal.
    expect(chess.move({ from: "a7", to: "a8" })).not.toBeNull();
  });

  it("pion arrivant sur la 8e rangée (e7-e8) déclenche la promotion", () => {
    const chess = new Chess("k7/4P3/8/8/8/8/8/4K3 w - - 0 1");
    const piece = chess.get("e7");
    expect(piece).toEqual({ type: "p", color: "w" });
    expect(isPawnPromotion(piece, "e8")).toBe(true);
    // Le coup légal exige un suffixe de promotion.
    expect(chess.move({ from: "e7", to: "e8", promotion: "q" })).not.toBeNull();
  });

  it("dame noire arrivant sur la 1re rangée NE déclenche PAS de promotion", () => {
    const chess = new Chess("4k3/8/8/8/8/8/8/3qK3 b - - 0 1");
    const piece = chess.get("d1");
    expect(piece).toEqual({ type: "q", color: "b" });
    expect(isPawnPromotion(piece, "c1")).toBe(false);
  });
});
