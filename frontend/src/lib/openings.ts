/**
 * Reconnaissance d'ouverture côté client.
 *
 * Les données (~2300 lignes jusqu'à 10 demi-coups) proviennent du livre
 * généré par `backend/scripts/build_openings_book.py` à partir du jeu de
 * données open source Lichess (CC0) et sont partagées avec le backend.
 *
 * La reconnaissance se fait par « plus long préfixe » : on retient la ligne
 * nommée la plus profonde qui correspond au début de la partie (ainsi `1. f4`
 * devient « Ouverture de l'oiseau » au lieu de rester « Après f4 »).
 */

import rawBook from "./openingsBook.json";

type BookRow = [key: string, eco: string, nameFr: string, nameEn: string];

const BOOK = rawBook as BookRow[];

export interface OpeningInfo {
  name: string;
  eco: string;
}

const byKey = new Map<string, { eco: string; fr: string; en: string }>();
for (const [key, eco, fr, en] of BOOK) {
  byKey.set(key, { eco, fr, en });
}

const normSan = (s: string) => s.replace(/[+#!?]/g, "").trim();

function normalizedMoves(moves: string[]): string[] {
  return moves.map(normSan).filter(Boolean);
}

/** Retourne le nom + ECO de l'ouverture reconnue (plus long préfixe nommé). */
export function openingInfoFromMoves(
  moves: string[],
  locale: "fr" | "en" = "fr"
): OpeningInfo {
  const norm = normalizedMoves(moves);
  if (norm.length === 0) {
    return { name: locale === "fr" ? "Position initiale" : "Starting position", eco: "" };
  }
  for (let i = norm.length; i > 0; i -= 1) {
    const entry = byKey.get(norm.slice(0, i).join(" "));
    if (entry) {
      return { name: locale === "fr" ? entry.fr : entry.en || entry.fr, eco: entry.eco };
    }
  }
  const first = norm[0];
  return { name: first.length <= 4 ? `Après ${first}` : "Milieu de partie", eco: "" };
}

export function openingNameFromMoves(moves: string[], locale: "fr" | "en" = "fr"): string {
  return openingInfoFromMoves(moves, locale).name;
}
