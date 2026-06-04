/** Noms d'ouverture simplifiés (premiers coups). */

const LINES: Record<string, string> = {
  "e4": "Ouverture du roi",
  "e4 e5": "Partie ouverte",
  "e4 c5": "Défense sicilienne",
  "e4 e6": "Défense française",
  "e4 c6": "Défense caro-kann",
  "d4": "Ouverture de la dame",
  "d4 d5": "Gambit de la dame refusé",
  "d4 Nf6": "Défense indienne",
  "d4 f5": "Défense hollandaise",
  "Nf3": "Ouverture Réti",
  "c4": "Ouverture anglaise",
  "e4 Nf6": "Défense alekhine",
  "e4 d5": "Scandinave",
};

export function openingNameFromMoves(moves: string[]): string {
  const whiteMoves = moves.filter((_, i) => i % 2 === 0);
  const keys = ["e4", "d4", "Nf3", "c4"];
  const first = whiteMoves[0];
  if (!first) return "Position initiale";

  const sanKey = (s: string) => s.replace(/[+#]/g, "").slice(0, 5);
  const w0 = sanKey(whiteMoves[0] ?? "");
  const b0 = moves[1] ? sanKey(moves[1]) : "";
  const w1 = whiteMoves[1] ? sanKey(whiteMoves[1]) : "";

  const two = `${w0} ${b0}`.trim();
  if (LINES[two]) return LINES[two];
  if (LINES[w0]) return LINES[w0];
  if (two.length > 3 && LINES[`${w0} ${b0.split("")[0]}`]) {
    return LINES[`${w0} ${b0}`] ?? LINES[w0];
  }
  if (w0.startsWith("e4") && b0.startsWith("e5")) return "Partie ouverte";
  if (w0.startsWith("d4") && b0.includes("Nf")) return "Défense indienne";
  return first.length <= 4 ? `Après ${first}` : "Milieu de partie";
}
