import { describe, expect, it } from "vitest";
import { scaleBoardSize, scaleBoardSizeLegacy } from "./useBoardSize";

describe("scaleBoardSize", () => {
  it("laisse la taille inchangée à 100%", () => {
    expect(scaleBoardSize(600, 800, 280, 100)).toBe(600);
  });

  it("rétrécit selon le pourcentage", () => {
    expect(scaleBoardSize(500, 800, 280, 70)).toBe(350);
  });

  it("ne descend jamais sous le minimum", () => {
    expect(scaleBoardSize(300, 800, 280, 70)).toBe(280);
  });

  it("agrandit lorsqu'il reste de la place", () => {
    expect(scaleBoardSize(500, 800, 280, 130)).toBe(650);
  });

  it("ne déborde jamais le plafond hardMax", () => {
    expect(scaleBoardSize(500, 520, 280, 130)).toBe(520);
  });

  it("gère un pourcentage invalide comme 100%", () => {
    expect(scaleBoardSize(600, 800, 280, Number.NaN)).toBe(600);
  });

  it("conserve le comportement legacy (compat)", () => {
    expect(scaleBoardSizeLegacy(500, 800, 800, 280, 130)).toBe(650);
    expect(scaleBoardSizeLegacy(500, 520, 800, 280, 130)).toBe(520);
    expect(scaleBoardSizeLegacy(500, 800, 540, 280, 130)).toBe(540);
  });
});
