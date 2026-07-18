import { describe, expect, it } from "vitest";
import { scaleBoardSize } from "./useBoardSize";

// autoSize = min(containerW, maxByHeight, cap) déjà calculé par le hook.
describe("scaleBoardSize", () => {
  it("laisse la taille inchangée à 100%", () => {
    expect(scaleBoardSize(600, 800, 800, 280, 100)).toBe(600);
  });

  it("rétrécit partout, même quand le conteneur est le facteur limitant", () => {
    // autoSize == containerW (conteneur limitant) : le rétrécissement doit marcher.
    expect(scaleBoardSize(500, 500, 800, 280, 70)).toBe(350);
  });

  it("ne descend jamais sous le minimum", () => {
    expect(scaleBoardSize(300, 300, 800, 280, 70)).toBe(280);
  });

  it("agrandit lorsqu'il reste de la place dans le conteneur", () => {
    // cap limitait à 500 mais le conteneur peut accueillir 800.
    expect(scaleBoardSize(500, 800, 800, 280, 130)).toBe(650);
  });

  it("ne déborde jamais le conteneur lors de l'agrandissement", () => {
    // 500 * 1.3 = 650 mais le conteneur ne fait que 520 -> borné à 520.
    expect(scaleBoardSize(500, 520, 800, 280, 130)).toBe(520);
  });

  it("ne déborde jamais la hauteur disponible lors de l'agrandissement", () => {
    // 500 * 1.3 = 650 mais la hauteur ne permet que 540 -> borné à 540.
    expect(scaleBoardSize(500, 800, 540, 280, 130)).toBe(540);
  });

  it("gère un pourcentage invalide comme 100%", () => {
    expect(scaleBoardSize(600, 800, 800, 280, Number.NaN)).toBe(600);
  });
});
